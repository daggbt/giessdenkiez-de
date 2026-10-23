# Perth Tree Watering (prototype)

A prototype web app that helps residents water young street trees managed by the **City of Perth** (Western Australia). It shows the City's tree inventory on a map, coloured by water need. Residents can log waterings and adopt trees.

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

`npx supabase status` prints the local API URL, keys and the mail UI (confirmation and reset emails land there). Put the local service-role key in `TEST_SUPABASE_SERVICE_ROLE_KEY` for the end-to-end tests. Add `?now=2027-01-15` to the URL in dev to see the app inside the watering season.

Scripts:

| Script                     | What it does                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `npm run lint`             | ESLint                                                                                 |
| `npx tsc --noEmit`         | Type check                                                                             |
| `npm run test:unit`        | Unit tests                                                                             |
| `npm run test:integration` | RPC and RLS tests against local Supabase                                               |
| `npm run test:e2e`         | Playwright smoke tests against local Supabase (builds the app; needs `supabase start`) |
| `npm run build`            | Type check and production build                                                        |
| `npm run import:trees`     | Re-imports the City of Perth trees, see below                                          |

`test:e2e` is not part of CI because CI does not start Supabase. It runs one worker on purpose: the map renders with software WebGL. It reuses a server already listening on `VITE_PORT`, so stop any old `vite preview` before running it, otherwise it tests a stale build.

## Refresh the tree data

```bash
npm run import:trees         # writes public/data/trees.geojson and supabase/seed.sql
git add public/data/trees.geojson supabase/seed.sql && git commit
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import:trees -- --push   # upserts into the hosted database
```

Then redeploy so the new GeoJSON is served. The service-role key is only ever read from the environment by this script; never give it a `VITE_` prefix.

## Deploy

1. Create a Supabase project in **ap-southeast-2 (Sydney)**, then `npx supabase link --project-ref <ref>` and `npx supabase db push`, and run the `--push` import above.
2. In Supabase Auth: set the Site URL to the production URL, add `<prod>/profile/reset-password` as a redirect URL, paste the templates from `templates/email/`, turn on **double confirm for email changes** to match `supabase/config.toml`, and configure a custom SMTP provider (the built-in sender is rate-limited and for testing only).
3. Create a Vercel project from this repository (Vite preset) with the `VITE_*` variables from `.env.sample`, pointing at the hosted Supabase project.
4. Restrict the Mapbox public token to the production domain and `http://localhost:5173`.

## Data sources

- Tree data © City of Perth, [Trees in the City](https://www.data.gov.au/data/dataset/perth-trees-in-the-city) (CC BY).
- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
- Map by Mapbox and OpenStreetMap contributors.

## Based on Gieß den Kiez

This project is a fork of [Gieß den Kiez](https://github.com/technologiestiftung/giessdenkiez-de) by [Technologiestiftung Berlin](https://www.technologiestiftung-berlin.de/) and [CityLAB Berlin](https://citylab-berlin.org/), released under the MIT licence. The original copyright notice is kept in [LICENSE](./LICENSE).
