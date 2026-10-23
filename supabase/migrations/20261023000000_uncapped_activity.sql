-- PostgREST caps every response at `max_rows` (1000 rows here and on hosted
-- Supabase), set-returning functions included, and cuts the rest off without an
-- error. With activity on more than 1000 trees the map silently lost the
-- waterings and adoptions of an arbitrary subset; a volunteer with more than
-- 1000 waterings saw wrong totals. Both functions now return a single jsonb
-- value, which the cap does not apply to.
--
-- A function's return type cannot be changed in place, so they are recreated
-- with the same names, arguments and grants.

drop function public.tree_activity_30d();

-- Feeds the map, one entry per tree with waterings in the last 30 days or any
-- adoption: { "<tree id>": [litres in 30 days, waterings in 30 days, adoptions] }.
-- About a third of the size of the same data as rows.
create function public.tree_activity_30d()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      coalesce(w.tree_id, a.tree_id),
      jsonb_build_array(
        coalesce(w.litres, 0),
        coalesce(w.waterings, 0),
        coalesce(a.adoptions, 0)
      )
    ),
    '{}'::jsonb
  )
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

drop function public.waterings_for_user(text);

-- The caller's own waterings, newest first, as an array of
-- { id, tree_id, amount, timestamp, username }. Empty for any other id.
create function public.waterings_for_user(u_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'tree_id', w.tree_id,
        'amount', w.amount,
        'timestamp', w."timestamp",
        'username', p.username
      )
      order by w.id desc
    ),
    '[]'::jsonb
  )
  from public.trees_watered w
  left join public.profiles p on p.id = w.uuid
  where u_id = auth.uid()::text
    and w.uuid = auth.uid();
$$;

revoke execute on function
  public.tree_activity_30d(),
  public.waterings_for_user(text)
from public, anon, authenticated;

grant execute on function public.tree_activity_30d() to anon, authenticated;
grant execute on function public.waterings_for_user(text) to authenticated;
