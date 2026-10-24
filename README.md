# Perth Tree Watering (prototype)

A prototype web app that helps residents water young street trees in Perth (Western Australia). It shows the public tree inventories of the **City of Perth**, the **City of Fremantle**, the **City of Cockburn** and the **Town of Bassendean** on a map, coloured by water need. Residents can log waterings and adopt trees.

The map opens on the City of Perth with its trees only. The council buttons under the search bar move the map to another council and load its trees; moving the map or searching into a council's area loads them too.

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

### Run on a chosen date

The watering season runs from 1 November to 30 April, and outside it every tree is green. To see the colours, start the app with a date inside the season:

```bash
npx supabase start                      # if it is not running yet
VITE_APP_DATE=2027-01-05 npm run dev    # the app acts as if it is 5 January 2027
```

Then open http://localhost:5173/map.

- Stop a dev server that is already running first: the date is read when the server starts. Without the flag, the app uses today's date.
- Only the season and the trees' ages follow the date. Waterings and rain keep their real dates, so yellow trees need a logged watering (see the next section).
- In dev, `?now=2027-01-05` in the URL does the same for one page load.
- A value that is not a date like `2027-01-05` is ignored, with a warning in the browser console.
- `npm run build` builds `VITE_APP_DATE` into the app, so leave it unset for a real deployment.

### Create a profile on the local app

Profiles are stored in the local Supabase database, and its emails go to the mail UI instead of real inboxes, so any email address works.

1. With the stack and the app running, open http://localhost:5173/profile and choose **Register now**.
2. Fill in the form:
   - **Username:** 3–50 letters or numbers, no spaces. Everyone sees it next to your waterings.
   - **Email:** any address, e.g. `me@example.com`.
   - **Password:** at least 8 characters, with upper and lower case letters, a number and a special character, e.g. `Watering-2027`.
3. Open the mail UI at http://localhost:57324, open the newest email and click its confirmation link.
4. If the app has not logged you in, log in at http://localhost:5173/profile.

To see a yellow tree, open an orange tree on the map, choose **I watered**, enter the litres (e.g. `50`) and choose **Save**. Once rain and waterings reach 400 litres in 30 days, the tree turns green. To remove the profile, go to **Profile** and choose **Delete account**; `npx supabase db reset` removes every local profile and watering.

## Refresh the tree data

```bash
npm run import:trees         # writes public/data/trees/<council>.geojson and supabase/seed.sql
git add public/data/trees supabase/seed.sql && git commit
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import:trees -- --push   # upserts into the hosted database
```

Then redeploy so the new GeoJSON is served. The service-role key is only ever read from the environment by this script; never give it a `VITE_` prefix.

The import fetches each council's ArcGIS layer in turn (`scripts/import-trees/sources.ts` maps their fields) and fails as a whole if one is unreachable. It writes one GeoJSON file per council, which the map loads when it gets to that council. Each council's name, links, how long it waters new trees, the area of its trees and where its button takes the map live in `src/config/councils.ts`. The import warns when trees fall outside that area, because the map cannot be moved beyond it. Tree ids of the City of Perth are its own asset ids, as before; the other councils' ids carry a prefix, e.g. `fremantle-TRE03987`.

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
