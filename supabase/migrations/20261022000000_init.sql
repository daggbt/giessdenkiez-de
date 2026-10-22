-- Perth Tree Watering: initial schema.
-- Ported in intent from giessdenkiez-de-postgres-api (waterings via RPC, signup
-- username, remove_account, is_username_taken, RLS) but not copied from it.

-- ---------------------------------------------------------------------------
-- trees: read-only for clients, written by the import script (service role)
-- ---------------------------------------------------------------------------
create table public.trees (
  id text primary key,
  source_object_id integer,
  botanical_name text,
  common_name text,
  family text,
  genus text,
  planted_date date,
  planted_date_precision text not null
    check (planted_date_precision in ('day', 'year', 'before_2019', 'unknown')),
  suburb text,
  height_m numeric,
  is_rare boolean not null default false,
  is_heritage boolean not null default false,
  is_significant boolean not null default false,
  is_significant_group boolean not null default false,
  lat double precision not null,
  lng double precision not null,
  imported_at timestamptz not null default now()
);

alter table public.trees enable row level security;
revoke all on public.trees from anon, authenticated;
grant select on public.trees to anon, authenticated;

create policy "trees readable by everyone" on public.trees
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- The username rules mirror src/components/profile/validation/validation.ts:
-- 3 to 50 characters, letters and digits only.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  constraint profiles_username_format
    check (char_length(username) between 3 and 50 and username ~ '^[a-zA-Z0-9]+$')
);

-- Usernames are unique regardless of case.
create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- On signup: use the username from the sign-up metadata (signup_username), or
-- the local part of the email. Characters outside [a-zA-Z0-9] are dropped, and
-- if the name is taken the first six characters of the user id are appended.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  suffix text := left(replace(new.id::text, '-', ''), 6);
begin
  base := regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'signup_username', split_part(new.email, '@', 1), ''),
    '[^a-zA-Z0-9]', '', 'g'
  );
  if char_length(base) < 3 then
    base := 'user' || base;
  end if;
  base := left(base, 50);

  begin
    insert into public.profiles (id, username) values (new.id, base);
  exception when unique_violation then
    insert into public.profiles (id, username) values (new.id, left(base, 44) || suffix);
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- waterings
-- ---------------------------------------------------------------------------
-- Deleting an account keeps its waterings (uuid becomes null), which the
-- waterings_for_tree function then shows without a username.
create table public.trees_watered (
  id bigint generated always as identity primary key,
  tree_id text not null references public.trees (id),
  uuid uuid references auth.users (id) on delete set null,
  -- Keep the upper bound in sync with city.maxWateringLitres (src/config/city.ts).
  amount numeric not null check (amount > 0 and amount <= 1000),
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint trees_watered_not_in_future check ("timestamp" <= now() + interval '1 day')
);

create index trees_watered_tree_id_idx on public.trees_watered (tree_id);
create index trees_watered_timestamp_idx on public.trees_watered ("timestamp");
create index trees_watered_uuid_idx on public.trees_watered (uuid);

alter table public.trees_watered enable row level security;
revoke all on public.trees_watered from anon, authenticated;
grant select, insert, delete on public.trees_watered to authenticated;

create policy "insert own waterings" on public.trees_watered
  for insert to authenticated with check (uuid = auth.uid());
create policy "select own waterings" on public.trees_watered
  for select to authenticated using (uuid = auth.uid());
create policy "delete own waterings" on public.trees_watered
  for delete to authenticated using (uuid = auth.uid());

-- ---------------------------------------------------------------------------
-- adoptions
-- ---------------------------------------------------------------------------
create table public.trees_adopted (
  id bigint generated always as identity primary key,
  tree_id text not null references public.trees (id),
  uuid uuid not null references auth.users (id) on delete cascade,
  unique (tree_id, uuid)
);

create index trees_adopted_uuid_idx on public.trees_adopted (uuid);

alter table public.trees_adopted enable row level security;
revoke all on public.trees_adopted from anon, authenticated;
grant select, insert, delete on public.trees_adopted to authenticated;

create policy "insert own adoptions" on public.trees_adopted
  for insert to authenticated with check (uuid = auth.uid());
create policy "select own adoptions" on public.trees_adopted
  for select to authenticated using (uuid = auth.uid());
create policy "delete own adoptions" on public.trees_adopted
  for delete to authenticated using (uuid = auth.uid());

-- ---------------------------------------------------------------------------
-- RPCs (security definer, search_path pinned)
-- ---------------------------------------------------------------------------

-- Public: all waterings of a tree with the waterer's username (null for
-- deleted accounts).
create function public.waterings_for_tree(t_id text)
returns table (id bigint, tree_id text, amount numeric, "timestamp" timestamptz, username text)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.tree_id, w.amount, w."timestamp", p.username
  from public.trees_watered w
  left join public.profiles p on p.id = w.uuid
  where w.tree_id = t_id
  order by w.id desc;
$$;

-- Only returns rows when called for the caller's own id.
create function public.waterings_for_user(u_id text)
returns table (id bigint, tree_id text, amount numeric, "timestamp" timestamptz, username text)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.tree_id, w.amount, w."timestamp", p.username
  from public.trees_watered w
  left join public.profiles p on p.id = w.uuid
  where u_id = auth.uid()::text
    and w.uuid = auth.uid()
  order by w.id desc;
$$;

-- Feeds the map: litres and number of waterings in the last 30 days, and the
-- number of adoptions, for every tree that has either.
create function public.tree_activity_30d()
returns table (tree_id text, watered_litres_30d numeric, watering_count_30d bigint, adopted_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(w.tree_id, a.tree_id),
    coalesce(w.litres, 0),
    coalesce(w.waterings, 0),
    coalesce(a.adoptions, 0)
  from (
    select tw.tree_id, sum(tw.amount) as litres, count(*) as waterings
    from public.trees_watered tw
    where tw."timestamp" > now() - interval '30 days'
    group by tw.tree_id
  ) w
  full outer join (
    select ta.tree_id, count(*) as adoptions
    from public.trees_adopted ta
    group by ta.tree_id
  ) a on a.tree_id = w.tree_id;
$$;

create function public.is_username_taken(given_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where lower(username) = lower(given_username)
  );
$$;

-- Deletes the caller's account. Profile and adoptions are removed by cascade;
-- waterings stay, with uuid set to null.
create function public.remove_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function
  public.waterings_for_tree(text),
  public.waterings_for_user(text),
  public.tree_activity_30d(),
  public.is_username_taken(text),
  public.remove_account(),
  public.handle_new_user()
from public, anon, authenticated;

grant execute on function
  public.waterings_for_tree(text),
  public.tree_activity_30d(),
  public.is_username_taken(text)
to anon, authenticated;

grant execute on function
  public.waterings_for_user(text),
  public.remove_account()
to authenticated;
