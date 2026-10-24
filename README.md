# Perth Tree Watering (prototype)

A prototype web app that helps residents water young street trees in Perth (Western Australia). It shows the public tree inventories of the **City of Perth**, the **City of Fremantle**, the **City of Cockburn** and the **Town of Bassendean** on a map, coloured by water need. Residents can log waterings and adopt trees.

> Status: prototype. The working plan lives in [docs/perth-prototype-roadmap.md](./docs/perth-prototype-roadmap.md).

## Run locally

Requirements: Node (version in `.nvmrc`), Docker (for the local Supabase stack) and a Mapbox public token.

```bash
nvm use                      # Node version from .nvmrc
npm ci
npx supabase start           # local Postgres, Auth and mail UI (ports 57320-57329)
npx supabase db reset        # applies supabase/migrations and supabase/seed.sql
cp .env.sample .env          # then set VITE_MAPBOX_API_KEY; the other values match the local stack
npm run dev
```

When new files arrive in `supabase/migrations`, run `npx supabase migration up`: it applies them and keeps your local accounts and data, while `db reset` starts from scratch.

`npx supabase status` prints the local API URL, keys and the mail UI (confirmation and reset emails land there). Put the local service-role key in `TEST_SUPABASE_SERVICE_ROLE_KEY` for the end-to-end tests.

To see the app inside the watering season, tell it which day it is: `VITE_APP_DATE=2027-01-15 npm run dev`. Without it, the app uses today's date. Only the season and the trees' ages follow that date; waterings and rain keep their real dates, so yellow trees appear once someone logs a watering. In dev, `?now=2027-01-15` in the URL does the same for one page load. `npm run build` builds `VITE_APP_DATE` into the app, so leave it unset for a real deployment.

Scripts:

| Script                     | What it does                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `npm run lint`             | ESLint                                                                                 |
| `npx tsc --noEmit`         | Type check                                                                             |
| `npm run test:unit`        | Unit tests                                                                             |
| `npm run test:integration` | RPC and RLS tests against local Supabase                                               |
| `npm run test:e2e`         | Playwright smoke tests against local Supabase (builds the app; needs `supabase start`) |
| `npm run build`            | Type check and production build                                                        |
| `npm run import:trees`     | Re-imports the councils' trees, see below                                              |

`test:e2e` is not part of CI because CI does not start Supabase. It runs one worker on purpose: the map renders with software WebGL. It reuses a server already listening on `VITE_PORT`, so stop any old `vite preview` before running it, otherwise it tests a stale build.

## Refresh the tree data

```bash
npm run import:trees         # writes public/data/trees.geojson and supabase/seed.sql
git add public/data/trees.geojson supabase/seed.sql && git commit
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import:trees -- --push   # upserts into the hosted database
```

Then redeploy so the new GeoJSON is served. The service-role key is only ever read from the environment by this script; never give it a `VITE_` prefix.

The import fetches each council's ArcGIS layer in turn (`scripts/import-trees/sources.ts` maps their fields) and fails as a whole if one is unreachable. Each council's name, links, how long it waters new trees and the area of its trees live in `src/config/councils.ts`. The import warns when trees fall outside that area, because the map cannot be moved beyond it. Tree ids of the City of Perth are its own asset ids, as before; the other councils' ids carry a prefix, e.g. `fremantle-TRE03987`.

To add another council: add its layer and field mapping to `sources.ts`, its entry to `councils.ts`, and its id to the `trees_council_check` constraint in a new migration.

## Deploy

1. Create a Supabase project in **ap-southeast-2 (Sydney)**, then `npx supabase link --project-ref <ref>` and `npx supabase db push`, and run the `--push` import above.
2. In Supabase Auth: set the Site URL to the production URL, add `<prod>/profile/reset-password` as a redirect URL, paste the templates from `templates/email/`, turn on **double confirm for email changes** to match `supabase/config.toml`, and configure a custom SMTP provider (the built-in sender is rate-limited and for testing only).
3. Create a Vercel project from this repository (Vite preset) with the `VITE_*` variables from `.env.sample`, pointing at the hosted Supabase project.
4. Restrict the Mapbox public token to the production domain and `http://localhost:5173`.

## Data sources

- Tree data © City of Perth, [Trees in the City](https://www.data.gov.au/data/dataset/perth-trees-in-the-city) (CC BY).
- Tree data © City of Fremantle, [Trees from Forestree](https://www.arcgis.com/home/item.html?id=6cf957db0a7346da8b99e6fb59691d31).
- Tree data © City of Cockburn, [Street Trees](https://www.arcgis.com/home/item.html?id=4e25763b23fe47c1bb928920152789a9).
- Tree data © Town of Bassendean, [All Trees](https://www.arcgis.com/home/item.html?id=5973d2d7b04648a4bb000fe13cc4db74).
- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
- Map by Mapbox and OpenStreetMap contributors.

Fremantle, Cockburn and Bassendean share their tree layers publicly but state no licence. This non-commercial prototype shows them with credit; ask the councils for permission (for example CC BY 4.0, as the City of Perth uses) before a public launch.

## Based on Gieß den Kiez

This project is a fork of [Gieß den Kiez](https://github.com/technologiestiftung/giessdenkiez-de) by [Technologiestiftung Berlin](https://www.technologiestiftung-berlin.de/) and [CityLAB Berlin](https://citylab-berlin.org/), released under the MIT licence. The original copyright notice is kept in [LICENSE](./LICENSE).
