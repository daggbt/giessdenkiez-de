-- The map now shows the trees of several councils, not only the City of Perth.
-- Each tree records its council, which says how long the council waters new
-- trees and where to report a problem (src/config/councils.ts). The trees
-- already in the table are the City of Perth's; the import sets the council of
-- every tree from now on.

alter table public.trees add column council text not null default 'perth';
alter table public.trees alter column council drop default;

alter table public.trees add constraint trees_council_check
  check (council in ('perth', 'fremantle', 'cockburn', 'bassendean'));
