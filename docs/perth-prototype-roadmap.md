# Perth Tree Watering — Prototype Roadmap

> Working title. The app name is an open question (see [Open questions](#7-open-questions-for-humans)).
> Last updated: 2026-10-22. Data facts in this document were measured against the live City of Perth dataset on that date.

## 0. How to use this document (read first, agent)

You are implementing a prototype fork of the Berlin app _Gieß den Kiez_ (this repository) for trees managed by the **City of Perth** (Western Australia). This document is the single source of truth for scope, decisions and order of work.

**Working rules**

1. Work through the milestones **in order** (M0 → M8). Do not start a milestone before the previous one's acceptance criteria pass.
2. Each task has an ID (e.g. `M4.3`). Reference it in commit messages: `feat(map): M4.3 switch trees source to GeoJSON`. Use small, focused commits — one task (or a coherent part of one) per commit.
3. After every task run:
   ```bash
   npm run lint && npx tsc --noEmit && npm run test:unit
   ```
   After every milestone additionally run `npm run build`, then tick the milestone's checkboxes in this file and add a line to the [Progress log](#9-progress-log).
4. **Never invent facts.** Litre amounts, URLs, legal text, cultural text, council policy and species facts beyond common knowledge must not be made up. Use a config value or string with a `TODO(confirm): <question>` marker and make sure the question appears in [Open questions](#7-open-questions-for-humans).
5. **Never commit secrets.** `.env` stays git-ignored. The Supabase service-role key is only ever read by Node scripts from a non-`VITE_` variable; anything prefixed `VITE_` is shipped to browsers.
6. Delete dead Berlin code rather than leaving it disabled. Do **not** rename the `gdk-*` Tailwind tokens or restyle the UI in this prototype — that is churn with no user value.
7. Keep the MIT licence and the upstream copyright notice. Credit upstream in the README and the About page.
8. When something in this document turns out to be wrong (a file moved, an API differs), fix the code sensibly, then correct this document in the same commit.

---

## 1. Goal, scope and definition of done

### Goal

A small, deployed, working prototype that a non-developer can demo to the City of Perth urban forest team and to one suburban council: _"Here are your ~17,000 trees; here are the young ones that need help this summer; residents can log waterings and adopt trees."_

### In scope

- Map of all City of Perth inventory trees, coloured by water need.
- Tree panel: species, planting date, suburb, water-needs ring (rain + volunteer waterings vs. target), "I watered", adopt.
- Accounts: sign up, log in, password reset, profile overview, adopted trees, change username/email/password, delete account.
- Perth logic: Southern-Hemisphere watering season, City of Perth age bands, rain from Open-Meteo.
- English (en-AU) only. Perth content, attribution, privacy notice.
- Deployment: Vercel (frontend) + Supabase in the Sydney region (database/auth).

### Out of scope (see [Backlog](#6-backlog-after-the-prototype))

Pumps layer, stats page, contact-another-waterer, German language, multi-council support, heatwave notifications, evapotranspiration-based water model, MapLibre migration, analytics.

### Definition of done (prototype)

- [ ] Public URL loads the map with ≥ 15,000 City of Perth trees on desktop and mobile.
- [ ] In-season, trees planted 2–5 years ago with no waterings are orange; council-watered and established trees are green.
- [ ] A new user can sign up (email confirmation), log a watering, see the tree change colour immediately, adopt it, see it in their profile, and delete their account.
- [ ] No Berlin-specific content remains except attribution.
- [ ] All `TODO(confirm)` items are listed in Open questions for the humans to resolve.
- [ ] Lint, type-check, unit tests and build pass in CI.

---

## 2. Context and key decisions

### 2.1 What upstream is

_Gieß den Kiez_ is five repositories: this React frontend; a Supabase backend (`giessdenkiez-de-postgres-api`); a Python harvester that turns German radar rainfall (DWD RADOLAN) into a Mapbox vector tileset nightly; an OpenStreetMap pumps harvester; and a tree-data import. It was built for ~960,000 Berlin trees.

### 2.2 What we found in this frontend (Berlin assumptions to remove)

| Location                                                                                        | Berlin assumption                                                                                                                                             |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/use-is-in-vegetation-period.tsx`                                                     | Watering season hard-coded to March–October (Northern Hemisphere).                                                                                            |
| `src/components/tree-detail/hooks/use-tree-water-needs-data.tsx`                                | Fixed 30-day litre targets; rain read from per-tree hourly radar array `radolan_days` in 0.1 mm units (`/ 10`, `* 24`, lines ~50–54).                         |
| `src/components/tree-detail/hooks/use-tree-age-classification.tsx`, `use-special-districts.tsx` | Berlin district-specific age limits.                                                                                                                          |
| `src/components/map/hooks/use-tree-circle-style.tsx` (~lines 100–140)                           | Duplicates the district list and age/litre thresholds inside a Mapbox expression.                                                                             |
| `src/components/map/hooks/use-map-setup.tsx`                                                    | Trees come from a Mapbox **vector tileset**; `sourceLayer: "trees"` also in `use-hovered-tree.tsx`, `use-selected-tree.tsx`, `use-update-tree-waterings.tsx`. |
| `src/components/location-search/hooks/use-geocoding.tsx:36`                                     | Geocoding hard-coded to `language=de&country=de` — Perth searches return nothing.                                                                             |
| `src/components/filter/age-range-slider/tree-age-grouped.tsx`                                   | Age histogram is a hard-coded Berlin array.                                                                                                                   |
| `src/components/stats/complex-charts/charts/density-map/density-map.tsx:24`                     | Projection centred on Berlin.                                                                                                                                 |
| `src/components/tree-detail/problem-card.tsx:22`                                                | Links to Berlin's public-order office.                                                                                                                        |
| `src/i18n/i18n-store.ts:26,47`                                                                  | German is the default language.                                                                                                                               |
| `src/i18n/content-types.ts:1`                                                                   | Tree types keyed by German genus names.                                                                                                                       |
| `src/components/tree-detail/tree-types.ts`                                                      | German DB columns (`art_dtsch`, `gattung_deutsch`, `pflanzjahr`, `bezirk`).                                                                                   |
| `src/components/info/credits.tsx`, `index.html`, `templates/email/*`                            | Berlin logos, Matomo, Berlin branding.                                                                                                                        |

### 2.3 What we found in the City of Perth data

Source: City of Perth "Trees in the City" ArcGIS feature service (details in [Appendix B](#appendix-b--tree-data-source-city-of-perth)).

- **17,118 records**, actively maintained (newest planting date = 2026-10-22). `RETIRED` is null for all records today.
- Fields: tree ID, planting date, suburb, botanical/common name, family, height, rare/heritage/significance flags.
- **`DATE_PLANTED` is unreliable for most trees:** 11,382 records carry 2019-05-10 (Perth time) with timestamps minutes apart — this is the date the inventory was bulk-captured, **not** a planting date. Interpretation: those trees existed before May 2019.
- 373 records have no date; a handful have placeholder years (1753, 1800, 41 × 1900).
- Some dates look like year-only precision (e.g. 204 × 2008-01-01, 99 × 2009-01-01).
- Other batch dates exist (308 × 2017-07-02, 201 × 2025-09-22, 170 × 2023-07-01). Treat as real for now; ask the City (Open question Q5).
- **Genuinely dated young trees: ~2,780 planted 2020 or later, ~1,870 since 2023.** These are the audience of the app.
- 6 records have a null `TREE_ID`; 3 `TREE_ID`s are duplicated.
- Suburb strings need normalising (`"EAST PERTH "`, `"Perth"` vs `"PERTH"`, 561 empty). Main suburbs: East Perth 5,985; Perth 4,801; West Perth 2,770; Crawley 1,381; Northbridge 924; Nedlands 666.
- Top species: _Platanus × acerifolia_ (2,018), _Corymbia maculata_ (1,148), _Jacaranda mimosifolia_ (1,050), _Eucalyptus rudis_ (930), _Lophostemon confertus_ (914), _Agonis flexuosa_ (731), _Melaleuca quinquenervia_ (584), _Phoenix canariensis_ (459), _Melaleuca rhaphiophylla_ (323), _Casuarina cunninghamiana_ (320), _Corymbia calophylla_ (299), _Liquidambar styraciflua_ (282).
- Licence: CC BY 3.0 AU on data.gov.au; the WA catalogue lists CC BY 4.0. Attribution required either way (Q7).

### 2.4 Decisions (locked for the prototype)

| ID  | Decision                                                                                                                                                                                                    | Rationale                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Fork this frontend; do not adopt the rest of the upstream stack.**                                                                                                                                        | The frontend gives us the polished map/panel/auth/profile UX for free. The tileset + Python/GDAL harvester exists for 960k trees; 17k trees fit in one GeoJSON file.                                              |
| D2  | **Monorepo:** frontend, `supabase/` (migrations, config) and `scripts/` (data import) live in this one repository.                                                                                          | One developer, one agent, one place.                                                                                                                                                                              |
| D3  | **Trees on the map come from a static `public/data/trees.geojson`**, generated by an import script, enriched client-side with live activity data and loaded as a Mapbox `geojson` source.                   | No tileset pipeline, no nightly cron. Waterings appear instantly.                                                                                                                                                 |
| D4  | **The same tree records are also in the Supabase `trees` table** (seeded by the same script).                                                                                                               | Foreign keys for waterings/adoptions; tree panel and profile query by ID.                                                                                                                                         |
| D5  | **A single pure domain module (`src/domain/`) computes age class, season, water needs and map status.** The Mapbox colour expression only maps a precomputed `need` property to a colour.                   | Removes the upstream duplication between hooks and map expression; unit-testable.                                                                                                                                 |
| D6  | **Rain: one Open-Meteo call for one point (Perth CBD)**, fetched by the browser and cached for the session.                                                                                                 | The City of Perth area is a few kilometres wide; summer rain is near zero and spatially uniform over 30 days. No radar, no harvester. Free for non-commercial use — revisit if a council deploys it commercially. |
| D7  | **Keep upstream's 30-day "bucket" water model**, parameterised for Perth. ET-based model is backlog.                                                                                                        | Smallest change that is honest.                                                                                                                                                                                   |
| D8  | **Keep upstream enum values `BABY` / `JUNIOR` / `SENIOR` / `UNKNOWN`** but redefine them for Perth: `BABY` = watered by the City (first 2 years), `JUNIOR` = needs residents' help, `SENIOR` = established. | Avoids renaming across dozens of UI files.                                                                                                                                                                        |
| D9  | **Keep upstream column names in `trees_watered` / `trees_adopted` (`uuid`, `tree_id`, `amount`, `timestamp`)**; rename only the `trees` columns (to English).                                               | Minimises frontend churn where nothing Berlin-specific exists.                                                                                                                                                    |
| D10 | **Do not denormalise usernames into `trees_watered`.** RPCs join `profiles` instead.                                                                                                                        | Removes two upstream triggers; account deletion anonymises automatically.                                                                                                                                         |
| D11 | **English only, `en-AU` formatting, "litres".** Keep the i18n structure (one locale) so strings stay centralised.                                                                                           | Less work per string; easy to add languages later.                                                                                                                                                                |
| D12 | **Keep Mapbox GL** (existing code, free tier is ample for a prototype).                                                                                                                                     | MapLibre swap is backlog.                                                                                                                                                                                         |
| D13 | **City-specific domain constants in `src/config/city.ts`**; deployment-specific values (keys, URLs, map centre/zoom) stay in `.env`.                                                                        | Type-safe and discoverable; env for what differs per environment.                                                                                                                                                 |
| D14 | **Remove** pumps, stats page, contact-a-waterer, German, Matomo, Berlin e2e specs, upstream release tooling in M0.                                                                                          | Shrinks the surface before we change anything.                                                                                                                                                                    |

---

## 3. Target architecture

```
BUILD TIME (manual: npm run import:trees)

  City of Perth ArcGIS ──► normalise ──┬──► public/data/trees.geojson   (static file, served by Vercel)
                                       ├──► supabase/seed.sql           (local dev)
                                       └──► upsert --push               (hosted Supabase)

RUN TIME (browser)

  public/data/trees.geojson ──────┐
  Supabase RPC tree_activity_30d ─┼──► trees-layer-store ──► domain/ enrich ──► Mapbox geojson source "trees"
  Open-Meteo daily rain ──────────┘         (age class, season, water needs, need status → colour)

  Tree panel / watering dialog / adopt / profile ◄──► Supabase (Sydney): auth, profiles, trees,
                                                      trees_watered, trees_adopted, RPCs, RLS
  After any watering/adoption change ──► trees-layer-store.refresh() ──► source.setData()
```

### Repository layout after the prototype

```
.
├── docs/perth-prototype-roadmap.md      ← this file
├── public/data/trees.geojson            ← GENERATED by scripts/import-trees (committed)
├── scripts/import-trees/                ← NEW: fetch.ts, normalise.ts, outputs.ts, index.ts
├── supabase/                            ← NEW: config.toml, migrations/, seed.sql (generated)
├── src/
│   ├── config/city.ts                   ← NEW: all Perth domain constants
│   ├── domain/                          ← NEW: pure TS, no React, no Mapbox
│   │   ├── time.ts                      (now + dev override, Perth-local dates)
│   │   ├── season.ts
│   │   ├── tree-age.ts
│   │   ├── water-needs.ts
│   │   ├── tree-status.ts
│   │   └── tree-layer.ts                (enrich GeoJSON features)
│   ├── weather/weather-store.ts         ← NEW: Open-Meteo
│   ├── components/map/trees-layer-store.ts ← NEW
│   └── components/…                     ← ADAPTED upstream components
├── templates/email/                     ← ADAPTED
└── tests/unit/                          ← NEW tests (Berlin tests deleted)
```

---

## 4. Inventory: take, adapt, remove, write new

Legend: **KEEP** = use as-is · **ADAPT** = keep, change behaviour/content · **REMOVE** = delete · **NEW** = write from scratch.

### 4.1 Frontend platform

| Item                                                                    | Action                                     | Notes                                       |
| ----------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Vite, React 19, TypeScript, Tailwind, zustand, date-fns, react-markdown | KEEP                                       |                                             |
| `@supabase/supabase-js`, `src/auth/supabase-client.ts`                  | KEEP                                       |                                             |
| `mapbox-gl`                                                             | KEEP                                       | D12                                         |
| `d3`, `d3-contour`                                                      | REMOVE in M0 if unused after stats removal | Check `grep -r "from \"d3" src`.            |
| `react-share`                                                           | KEEP                                       | Update share text in M7.                    |
| ESLint/Prettier configs (`@technologiestiftung/*`)                      | KEEP                                       | Harmless, consistent style.                 |
| semantic-release, `release.config.js`, `.all-contributorsrc`            | REMOVE                                     |                                             |
| `tailwind.config.js` (`gdk-*` tokens)                                   | KEEP                                       | Do not rename tokens.                       |
| `index.html`                                                            | ADAPT                                      | Remove Matomo; title/meta/OG from app name. |
| `vercel.json` (SPA rewrite)                                             | KEEP                                       |                                             |
| `.env.sample`                                                           | ADAPT                                      | See Appendix E.                             |

### 4.2 Map

| Item                                                                                                              | Action | Notes                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `components/map/map.tsx`, `map-store.tsx`                                                                         | KEEP   |                                                                                |
| `hooks/use-map-setup.tsx`                                                                                         | ADAPT  | GeoJSON source, no source-layer, no pumps, `maxBounds`.                        |
| `hooks/use-map-constants.tsx`                                                                                     | ADAPT  | Remove pump icons and MapComplete URL.                                         |
| `hooks/use-tree-circle-style.tsx`                                                                                 | ADAPT  | Colour = match on `need`; filters use `age_years`, `adopted`, `watered_30d_l`. |
| `hooks/use-hovered-tree.tsx`, `use-selected-tree.tsx`, `use-map-trees-interaction.tsx`, `use-map-interaction.tsx` | ADAPT  | Remove `sourceLayer`; remove pump branches.                                    |
| `hooks/use-*pump*.tsx`, `components/pumps/`, `public/images/pump_*.png`                                           | REMOVE |                                                                                |
| `tree-detail/hooks/use-update-tree-waterings.tsx` + `tree-store.loadTodaysWaterings`                              | REMOVE | Replaced by layer refresh (M4.5).                                              |
| `map-attribution.tsx`                                                                                             | ADAPT  | Add City of Perth + Open-Meteo attribution.                                    |
| `components/map/trees-layer-store.ts`                                                                             | NEW    | Loads GeoJSON + activity + weather, enriches, exposes `refresh()`.             |
| `components/legend/legend.tsx`                                                                                    | ADAPT  | Copy only.                                                                     |

### 4.3 Search and filters

| Item                                                                    | Action | Notes                                                                              |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `location-search/*`                                                     | ADAPT  | Geocoding: `country=au`, `language=en`, `proximity`.                               |
| `filter/filter.tsx`, `filter-store.tsx`                                 | ADAPT  | Remove pumps toggle and language param recovery.                                   |
| `filter/age-range-slider/*`                                             | ADAPT  | Histogram computed from enriched features; range 0–10 years + "10+ / before 2019". |
| `filter/age-range-slider/tree-age-grouped.tsx` (hard-coded Berlin data) | REMOVE | Replace with computed histogram.                                                   |

### 4.4 Tree panel

| Item                                                                           | Action                                         | Notes                                                                 |
| ------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------- |
| `tree-detail/tree-detail.tsx`                                                  | ADAPT                                          | New fields, species card lookup by genus.                             |
| `tree-detail/tree-types.ts`                                                    | ADAPT                                          | Perth `TreeCoreData` (Appendix D), remove `radolan_*`.                |
| `tree-detail/tree-age.tsx`                                                     | ADAPT                                          | Planting text by precision.                                           |
| `tree-detail/tree-adopt-card.tsx`                                              | ADAPT                                          | `common_name` / `botanical_name`.                                     |
| `tree-detail/tree-flier.tsx`                                                   | KEEP                                           | Content changes in `en.ts`.                                           |
| `tree-detail/problem-card.tsx`                                                 | ADAPT                                          | URL from `city.reportProblemUrl`.                                     |
| `tree-detail/hooks/use-tree-age-classification.tsx`                            | ADAPT                                          | Thin wrapper over `domain/tree-age.ts`.                               |
| `tree-detail/hooks/use-tree-water-needs-data.tsx`                              | ADAPT                                          | Thin wrapper over `domain/water-needs.ts`; rain from weather store.   |
| `tree-detail/hooks/use-special-districts.tsx`                                  | REMOVE                                         |                                                                       |
| `tree-detail/hooks/use-water-tree.tsx`                                         | ADAPT                                          | Drop `username` from insert; refresh layer.                           |
| `tree-detail/hooks/use-fetch-tree-data.tsx`                                    | KEEP                                           |                                                                       |
| `tree-detail/stores/tree-store.tsx`                                            | ADAPT                                          | Explicit column select; remove today's-waterings logic.               |
| `tree-detail/stores/adopt-tree-store.tsx`                                      | ADAPT                                          | Adoption count from layer store activity; refresh layer after toggle. |
| `tree-detail/tree-water-needs/*` (ring, hint, title, tooltip, watering dialog) | ADAPT                                          | Perth copy, season wording, max litres, Perth "today".                |
| `tree-detail/tree-water-needs/contact-dialog.tsx`                              | REMOVE                                         | Backlog B3.                                                           |
| `tree-detail/last-waterings/*`                                                 | ADAPT                                          | Remove contact button/alerts; null username → "Former user".          |
| `src/utils/use-is-in-vegetation-period.tsx`                                    | ADAPT → rename `use-is-in-watering-season.tsx` | Wrapper over `domain/season.ts`.                                      |

### 4.5 Accounts and profile

| Item                                                     | Action | Notes                                          |
| -------------------------------------------------------- | ------ | ---------------------------------------------- |
| `src/auth/auth-store.tsx`                                | KEEP   | Already sends `signup_username` metadata.      |
| `profile/auth-card/*` (login, register, forgot password) | KEEP   | Add public-username notice to register (M6.7). |
| `profile/validation/*`                                   | KEEP   | DB constraints must mirror these rules.        |
| `profile/profile-logged-in/*`                            | ADAPT  | Column names; copy.                            |
| `shared-stores/profile-store.tsx`                        | ADAPT  | `art_dtsch` → `common_name`, `botanical_name`. |
| `shared-stores/selected-contact-recipient-store.tsx`     | REMOVE |                                                |
| `templates/email/*`                                      | ADAPT  | Rebrand all five templates.                    |

### 4.6 Other screens and cross-cutting

| Item                                                                                                                                                        | Action | Notes                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| `components/stats/**`, `/stats` route, navbar stats item, `public/data/berlin_bezirke.geojson`, `public/images/leafs/`                                      | REMOVE | Backlog B4.                                              |
| `components/splash/*`                                                                                                                                       | ADAPT  | Perth copy; no language toggle.                          |
| `components/info/*`                                                                                                                                         | ADAPT  | Perth FAQ, credits, Acknowledgement of Country, privacy. |
| `components/router/languageToggle.tsx` + its usages (navbar, splash, info, profile, password-reset, profile-logged-in, stats)                               | REMOVE |                                                          |
| `components/router/*`                                                                                                                                       | ADAPT  | Remove `/stats`.                                         |
| `components/matomo/*`                                                                                                                                       | REMOVE |                                                          |
| `components/banner/*`                                                                                                                                       | KEEP   | Env-flagged.                                             |
| `src/i18n/de.ts`                                                                                                                                            | REMOVE |                                                          |
| `src/i18n/en.ts`, `content-types.ts`, `i18n-store.ts`                                                                                                       | ADAPT  | Single locale, `en-AU`.                                  |
| `error/*`, `loading/*`, `skeleton/*`, `buttons/*`, `icons/*`, `alert-dialog/*`, `markdown/*`, `anchor-link/*`, `input/*`, `card-flip/*`, `page-not-found/*` | KEEP   |                                                          |

### 4.7 Backend (from `giessdenkiez-de-postgres-api`, ported into a fresh migration)

| Upstream item                                                                                             | Action       | Notes                                                             |
| --------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `trees` table (German columns)                                                                            | NEW          | English columns, Appendix D.                                      |
| `profiles` + `handle_new_user` trigger                                                                    | ADAPT (port) | Username collision handling inline.                               |
| `trees_watered`, `trees_adopted` + RLS                                                                    | ADAPT (port) | Proper `uuid` type + FKs (D9, D10).                               |
| `waterings_for_tree`, `waterings_for_user`                                                                | ADAPT (port) | Join `profiles`; `waterings_for_user` restricted to `auth.uid()`. |
| `is_username_taken`, `remove_account`                                                                     | KEEP (port)  |                                                                   |
| `delete_user`, `update_username_on_trees_watered`, `username_append_uuid` triggers                        | REMOVE       | Replaced by FKs / joins.                                          |
| `watered_today`, `get_watered_and_adopted`                                                                | REMOVE       | Replaced by `tree_activity_30d`.                                  |
| `tree_activity_30d`                                                                                       | NEW          | Feeds the map.                                                    |
| `radolan_*`, `daily_weather_data`, stats functions/materialised views, `contact_requests`, edge functions | REMOVE       | Not ported.                                                       |

---

## 5. Milestones

### M0 — Fork hygiene and strip out-of-scope features

Outcome: a smaller codebase that still builds. The app will not show trees yet (no backend/data until M2–M4).

- [x] **M0.1** _(human)_ Fork on GitHub, clone, `git checkout -b prototype`. Copy this file into the fork if it is not there.
- [x] **M0.2** `nvm use` (Node v24.21.0 per `.nvmrc`), `npm ci`, run `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run build`. Record results in the Progress log; if anything already fails, note it and fix only what blocks the build. Run `npm run prettier` once so this document passes `npm run prettier:ci` (CI checks it).
- [x] **M0.3** `package.json`: `name` → `perth-tree-watering`, `version` → `0.1.0`; remove semantic-release packages and `release.config.js`; delete `.all-contributorsrc`; change `"test"` to run unit tests only.
- [x] **M0.4** CI: delete `.github/workflows/{rain,pumps,release,warnForPRIntoMain,e2e-tests}.yml`. Keep `linting-and-unit-tests.yml`, adapt branch filters to `main`/`prototype`, make sure it needs no secrets, and add a `npm run build` step with dummy `VITE_*` values if the build requires them.
- [x] **M0.5** README: replace with a short prototype README (what, how to run, data sources) and an "Based on Gieß den Kiez by Technologiestiftung Berlin / CityLAB Berlin (MIT)" section. Keep `LICENSE` unchanged.
- [x] **M0.6** English only: delete `src/i18n/de.ts`; `i18n-store.ts` uses only `en`, ignores the `lang` URL param, and formats with `en-AU`; delete `languageToggle.tsx` and all usages; remove `recoverLanguageParams` from `filter-store.tsx` and `router.tsx`.
- [x] **M0.7** Remove pumps: `components/pumps/`, `use-hovered-pump.tsx`, `use-map-pumps-interaction.tsx`, `use-pump-icon-style.tsx`, `use-pump-store.tsx`, `use-selected-pump.tsx`, pump code in `use-map-setup.tsx`/`use-map-interaction.tsx`/`use-map-trees-interaction.tsx`/`use-map-constants.tsx`, pumps toggle and state in `filter*`, pump strings in `en.ts`/`content-types.ts`, `public/images/pump_*.png`, `VITE_MAP_PUMPS_SOURCE_URL`.
- [x] **M0.8** Remove stats: `components/stats/`, `/stats` route, navbar item, `public/data/berlin_bezirke.geojson`, `public/images/leafs/` (verify unused), `VITE_BEZIRKE_URL`, stats strings. Remove `d3`/`d3-contour`/`@types/d3` if no longer imported.
- [x] **M0.9** Remove contact-a-waterer: `contact-dialog.tsx`, `selected-contact-recipient-store.tsx`, contact button, `check_contact_request` call and related alert dialogs in `last-waterings/watering-card.tsx`, contact strings.
- [x] **M0.10** Remove Matomo: snippet in `index.html`, `components/matomo/`, all `trackEvent`/`_paq` calls, `VITE_MATOMO_*`.
- [x] **M0.11** E2E: delete Berlin specs under `tests/e2e/` (`*.test.ts` and spec folders). Keep `playwright.config.ts`, `supabase.ts`, `mailpit.ts`, `fixtures/`, `session.ts`, `locators.ts` as helpers for M8; if they do not compile without specs, move them to `tests/e2e/_helpers/` and exclude from `tsc`.

**Acceptance**

- Lint, `tsc --noEmit`, unit tests and build pass.
- `grep -rniE "pump|matomo|_paq|languageToggle|bezirke" src index.html` returns nothing.
- `src/i18n/de.ts` and `components/stats/` no longer exist.

---

### M1 — City config and domain core (pure, tested)

Outcome: all Perth rules live in `src/config/city.ts` and `src/domain/`, fully unit-tested; hooks delegate to them; Berlin district logic is gone.

- [x] **M1.1** Create `src/config/city.ts` exactly as in [Appendix A](#appendix-a--srcconfigcityts-proposed), keeping every `TODO(confirm)` comment.
- [x] **M1.2** `src/domain/time.ts`:
  - `getNow(): Date` — returns `new Date()`, except in dev builds (`import.meta.env.DEV`) where a `?now=YYYY-MM-DD` URL param overrides it (for testing the in-season UI in October).
  - `toCityDateString(date: Date, timeZone = city.timeZone): string` → `YYYY-MM-DD` using `Intl.DateTimeFormat` (no new dependency).
- [x] **M1.3** `src/domain/season.ts`: `isInWateringSeason(now: Date, season = city.wateringSeason, timeZone = city.timeZone): boolean`. Months in config are 1-based and the range is inclusive and **may wrap over New Year**. Evaluate using the city-local date.
  - Tests: Nov 1 ✓, Oct 31 ✗, Dec 31 ✓, Jan 1 ✓, Apr 30 ✓, May 1 ✗, Jul 15 ✗; a non-wrapping season (e.g. 3–10) still works; a UTC instant that is already Nov 1 in Perth but Oct 31 in UTC counts as in-season.
- [x] **M1.4** `src/domain/tree-age.ts`:
  - Input: `{ planted_date: string | null; planted_date_precision: "day" | "year" | "before_2019" | "unknown" }`, `now`.
  - `getTreeAge()` → `{ ageYears: number | null; isLowerBound: boolean }`. Fractional years = days / 365.25. `before_2019` → age since `city.inventoryCaptureDate`, `isLowerBound: true`. Future planting dates → `null`.
  - `classifyTreeAge()` → `"BABY" | "JUNIOR" | "SENIOR" | "UNKNOWN"`: `ageYears < city.ageBands.councilCareMaxYears` → BABY; `< city.ageBands.needsHelpMaxYears` → JUNIOR; else SENIOR. If `isLowerBound` and the lower bound is below `needsHelpMaxYears` → UNKNOWN (we cannot tell). `null` → UNKNOWN.
  - Tests: planted 6 months ago → BABY; 3 years → JUNIOR; 8 years → SENIOR; `before_2019` today → SENIOR; `unknown` → UNKNOWN; year-precision `2008-01-01` → SENIOR; future date → UNKNOWN; band edges (exactly 2.0 and 5.0 years).
- [x] **M1.5** `src/domain/water-needs.ts`: port the arithmetic of `use-tree-water-needs-data.tsx` into `computeWaterNeeds({ ageClass, rain30dMm, waterings, now })` returning the same fields as `TreeWateringDataState` minus colours (`rainSum`, `wateringSum`, `rainPercentage`, `wateringPercentage`, `otherWateringPercentage`, `referenceWaterAmount`, `stillMissingWater`, `shouldBeWatered`).
  - `rainSum = rain30dMm * city.rainCatchmentM2` (1 mm on 1 m² = 1 L, upstream's implicit assumption — document it in a comment).
  - `referenceWaterAmount = city.targetLitresPer30Days[ageClass]`.
  - `wateringSum` = sum of waterings with timestamp within the last 30 days of `now`.
  - Keep upstream percentage logic. `otherWateringPercentage` applies to BABY (City) and SENIOR (established), as upstream.
  - Tests: port the scenarios from the existing `tests/unit/*-tree-water-needs*.test.ts` (non-special-district ones) with Perth targets; add: rain only; rain + watering exceeding target (percentages sum ≤ 1); waterings older than 30 days ignored.
- [x] **M1.6** `src/domain/tree-status.ts`:
  ```ts
  export type NeedStatus =
  	| "OFF_SEASON"
  	| "COUNCIL_CARE"
  	| "ESTABLISHED"
  	| "UNKNOWN_AGE"
  	| "SATISFIED"
  	| "PARTIAL"
  	| "THIRSTY";
  export function getNeedStatus(args: {
  	inSeason: boolean;
  	ageClass: AgeClass;
  	rain30dMm: number;
  	watered30dL: number;
  }): NeedStatus;
  ```
  Rules, in order: not in season → `OFF_SEASON`; BABY → `COUNCIL_CARE`; SENIOR → `ESTABLISHED`; UNKNOWN → `UNKNOWN_AGE`; JUNIOR: `rain + watered ≥ target` → `SATISFIED`; else `watered30dL > 0` → `PARTIAL`; else `THIRSTY`. (Matches upstream semantics: yellow = "someone watered it recently but it is still short".)
  Also export `NEED_STATUS_COLOR_TOKEN: Record<NeedStatus, "gdk-neon-green" | "gdk-tree-yellow" | "gdk-tree-orange">` — `PARTIAL` → yellow, `THIRSTY` → orange, all others → green.
  Tests: one per rule plus precedence (off-season beats everything).
- [x] **M1.7** Refactor hooks to thin wrappers: `use-is-in-vegetation-period.tsx` → `use-is-in-watering-season.tsx` (update imports); `use-tree-age-classification.tsx` → `domain/tree-age.ts`; `use-tree-water-needs-data.tsx` → `domain/water-needs.ts` (take `rain30dMm` as a parameter for now; M4 wires the weather store). Delete `use-special-districts.tsx` and every special-district branch (e.g. in `water-needs-hint.tsx`, `ageAndWaterHintSpecialDistrict` in `en.ts`/`content-types.ts`).
- [x] **M1.8** Replace `TreeCoreData` in `tree-types.ts` with the Perth shape (mirrors the `trees` table in Appendix D). Fix all compile errors (`tree-detail.tsx`, `tree-adopt-card.tsx`, `tree-age.tsx`, `shared-stores/profile-store.tsx`, `adopted-trees*`). For now species-card lookup can return nothing; M5 fills it.
- [x] **M1.9** Delete the Berlin unit tests in `tests/unit/` once their useful scenarios are ported.

**Acceptance**

- New tests cover season, age, water needs and status; all pass.
- `grep -rniE "Mitte|Pankow|Neukölln|Lichtenberg|pflanzjahr|art_dtsch|gattung|bezirk|radolan" src` returns nothing.
- `tsc --noEmit` passes.

---

### M2 — Tree data import pipeline

Outcome: one command turns the City of Perth feature service into a GeoJSON file, a seed SQL file and a quality report; optionally upserts to hosted Supabase.

- [x] **M2.1** Add dev dependency `tsx`. Create `scripts/import-trees/{fetch.ts,normalise.ts,outputs.ts,index.ts}` and npm script `"import:trees": "tsx scripts/import-trees/index.ts"`. Flags: `--out-geojson` (default `public/data/trees.geojson`), `--out-seed` (default `supabase/seed.sql`), `--push` (upsert to Supabase), `--dry-run`.
- [x] **M2.2** `fetch.ts`: page through the layer (Appendix B query) with `orderByFields=OBJECTID`, `resultRecordCount=2000`, increasing `resultOffset` until a page returns fewer than 2000 features. Retry each page up to 3× with backoff. First call `returnCountOnly=true`; at the end assert fetched count == expected count.
- [x] **M2.3** `normalise.ts` — pure functions, rules in Appendix B (ID fallback, dedupe, date precision, genus, suburb casing, flags, geometry validation, skip retired). Export `normaliseFeature()` and `normaliseAll()` (returns records + a report object).
- [x] **M2.4** `outputs.ts`:
  - GeoJSON `FeatureCollection`, coordinates rounded to 6 decimals, properties limited to `id`, `genus`, `common_name`, `planted_date`, `planted_date_precision`. Fail if the file exceeds 6 MB.
  - `supabase/seed.sql`: header comment ("generated — do not edit"), batched `INSERT INTO public.trees (...) VALUES ... ON CONFLICT (id) DO UPDATE SET ...` (batches of 1,000 rows), proper SQL string escaping.
  - `data/import-report.json` (git-ignored) and a console summary: total fetched, kept, skipped (by reason), duplicates, counts by `planted_date_precision`, by suburb, top 15 genera, bounding box and centre.
- [x] **M2.5** `--push`: read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment (never `VITE_`), upsert in batches of 500 with `supabase-js`. Refuse to run if either is missing.
- [x] **M2.6** Unit tests for `normalise.ts` using the sample rows in Appendix B as fixtures: 2019-05-10 → `before_2019` with null date; null date → `unknown`; 1900 → `unknown`; `2008-01-01` → `year`; a normal date → `day`; `"EAST PERTH "` → `East Perth`; null `TREE_ID` → `obj-<OBJECTID>`; duplicate `TREE_ID` → second gets `-<OBJECTID>` suffix; botanical `"Platanus x acerifolia"` → genus `Platanus`.
- [x] **M2.7** Run it. Commit `public/data/trees.geojson` and `supabase/seed.sql`. Put the reported bbox/centre into `.env.sample` (`VITE_MAP_BOUNDING_BOX`, `VITE_MAP_CENTER_LNG/LAT`).

**Acceptance**

- Kept records ≈ 17,100 (data changes daily; accept 15,000–20,000).
- `before_2019` ≈ 11,400; `day` + `year` ≈ 5,300; `unknown` ≈ 400 (± 10 %). Investigate and explain larger deviations in the Progress log.
- GeoJSON < 6 MB; tests pass.

---

### M3 — Supabase backend (local)

Outcome: local Supabase with schema, RLS, RPCs and seeded trees. Requires Docker.

- [x] **M3.1** Add dev dependency `supabase` (CLI). `npx supabase init`. In `supabase/config.toml`: `site_url = "http://localhost:5173"`, add `http://localhost:5173/profile/reset-password` to `additional_redirect_urls`, keep the default seed path `./seed.sql`.
- [x] **M3.2** Create `supabase/migrations/<timestamp>_init.sql` from [Appendix D](#appendix-d--database-schema-sketch). Port behaviour from upstream where noted; do not copy the 43 upstream migrations.
- [x] **M3.3** `npx supabase start`, then `npx supabase db reset` (applies migration + seed). Put the local API URL and anon key (`npx supabase status`) into `.env`.
- [x] **M3.4** RPC/RLS smoke test as a vitest file `tests/integration/supabase.test.ts` (separate config, skipped unless `SUPABASE_URL` is reachable; npm script `test:integration`). Use the service-role key only to create/delete two test users. Assert:
  - anon can `select` from `trees`; anon cannot insert into `trees_watered`;
  - anon can call `tree_activity_30d`, `waterings_for_tree`, `is_username_taken`;
  - user A can insert/delete own watering and adoption; cannot delete user B's;
  - `waterings_for_user(B)` called by A returns nothing;
  - inserting `amount = 0` or `amount > city max` fails;
  - signing up with a taken username still creates a profile with a suffixed username;
  - after `remove_account` for A: A's profile and adoptions are gone, A's waterings remain with `uuid = null` and `username = null` from `waterings_for_tree`.

**Acceptance**

- `npx supabase db reset` succeeds; `select count(*) from trees` matches the import report.
- `npm run test:integration` passes against local Supabase.

---

### M4 — Map on Perth data

Outcome: the map shows Perth trees coloured by need; search and filters work.

- [ ] **M4.1** `src/weather/weather-store.ts` (zustand): fetch Open-Meteo once per session (Appendix C), cache in `sessionStorage` for 1 hour (wrap storage access in try/catch). Expose `{ status: "loading" | "ready" | "error"; rain30dMm: number; daily: {...} }`. On error, `rain30dMm = 0` and `status = "error"`.
- [ ] **M4.2** `src/domain/tree-layer.ts`: `enrichFeatures(features, activityById, rain30dMm, now)` → features with added properties `age_years` (number or `-1` for unknown — Mapbox expressions dislike null), `age_class`, `adopted` (boolean), `watered_30d_l`, `need` (NeedStatus). Unit-test it.
- [ ] **M4.3** `src/components/map/trees-layer-store.ts`: `load()` fetches `VITE_TREES_GEOJSON_URL`, `tree_activity_30d` and weather in parallel, enriches, stores the `FeatureCollection` and `activityById`; `refresh()` re-fetches activity, re-enriches, and calls `map.getSource("trees").setData(...)`. Expose `treeCount`.
- [ ] **M4.4** `use-map-setup.tsx`: add the source as `{ type: "geojson", data: <enriched>, promoteId: "id" }`, remove `"source-layer"`, set `maxBounds` to the bbox padded by ~10 %. Only call `setIsMapLoaded(true)` after the trees source is added.
- [ ] **M4.5** Remove every `sourceLayer: "trees"` (`use-map-setup.tsx`, `use-hovered-tree.tsx`, `use-selected-tree.tsx`). Delete `use-update-tree-waterings.tsx`, `tree-store.loadTodaysWaterings`/`todaysWaterings` and their callers; after watering/deleting/adopting/unadopting call `useTreesLayerStore.getState().refresh()` instead. (`setData` on ~17k points should be fast enough; if it's visibly slow, switch to `setFeatureState({ need })` overrides and note it here.)
- [ ] **M4.6** `use-tree-circle-style.tsx`: default colour expression = `["match", ["get", "need"], "THIRSTY", <orange>, "PARTIAL", <yellow>, <green>]` using `NEED_STATUS_COLOR_TOKEN`. Rewrite filter expressions to use `age_years` (`-1` = unknown → grey when an age filter is active), `adopted`, `watered_30d_l > 0`. Delete the Berlin district list and literal thresholds.
- [ ] **M4.7** Age slider: compute the histogram from the enriched features (buckets 0…9 years + one "10+ / before 2019" bucket). Slider range 0–10 where 10 means "10 and older" (replaces upstream's 200 → Infinity sentinel).
- [ ] **M4.8** `use-geocoding.tsx`: `country=au`, `language=en`, `proximity=<centre lng>,<centre lat>`, keep `bbox` from env.
- [ ] **M4.9** `map-attribution.tsx`: add "Tree data © City of Perth (CC BY)" linking to the dataset, and "Weather data by Open-Meteo.com" (CC BY 4.0).
- [ ] **M4.10** Legend copy: green "Fine for now, or watered by the City", yellow "Watered recently, needs more", orange "Thirsty — needs water", grey "Filtered out".

**Acceptance**

- `npm run dev` with local Supabase: ~17k dots over the City of Perth; map cannot be panned far away.
- `/map?now=2027-01-15` (dev): a mix of green and orange; trees planted 2021–2024 are orange; trees planted 2025–2026 and before 2019 are green.
- `/map` today (2026-10-22, before the season): all green.
- Hover highlights, click opens the panel, `?treeId=` deep link works.
- Searching "Hay Street" or "Elizabeth Quay" returns Perth results.
- Each filter changes the map as expected.

---

### M5 — Tree panel for Perth

Outcome: the panel tells the Perth story correctly for every age class and season.

- [ ] **M5.1** `tree-store.tsx`: select explicit columns from `trees`.
- [ ] **M5.2** Panel header and facts: common name as title (fallback botanical), botanical name in italics, family; planting line by precision — `day`: "Planted 3 July 2023 (about 3 years ago)"; `year`: "Planted in 2008"; `before_2019`: "Planted before 2019"; `unknown`: "Planting date unknown"; suburb; height if present; small badges for significant / heritage / rare.
- [ ] **M5.3** Water ring uses `rain30dMm` from the weather store. "Other" segment label: BABY → "Watered by the City", SENIOR → "Established". Off-season variant replaces the upstream "winter / hibernation" wording with "Outside the watering season (May–October), rain usually covers the trees' needs." (derive the months from config).
- [ ] **M5.4** Age-and-water hint (`water-needs-hint.tsx`) built from config values, e.g. "Under {councilCareMaxYears} years: the City of Perth waters new trees. {councilCareMaxYears}–{needsHelpMaxYears} years: these trees benefit most from your help. Older trees are usually established." Mark the sentence about City watering with the source (City of Perth Urban Forest FAQ).
- [ ] **M5.5** Species cards: replace the German `TreeTypeId` union with genus strings for the top 12 genera from the M2 report (expected: Platanus, Corymbia, Jacaranda, Eucalyptus, Lophostemon, Agonis, Melaleuca, Phoenix, Casuarina, Liquidambar, + two more). Draft 2–3 neutral sentences each (origin, common use as street tree); no watering numbers. Add `// TODO(confirm): species text drafted by agent, needs review` above the list. Look up by `genus`.
- [ ] **M5.6** Problem card: link to `city.reportProblemUrl`; copy "Noticed damage or a problem with this tree? Report it to the City of Perth."
- [ ] **M5.7** Weather error state: if `status === "error"`, show a short note under the ring ("Rain data currently unavailable — showing waterings only").

**Acceptance (use `?now=2027-01-15`)**

- A tree planted in 2023 shows JUNIOR text and "still needs X litres".
- A tree planted in 2026 shows "Watered by the City".
- A `before_2019` tree shows "Planted before 2019" and established text.
- An `unknown` tree shows the unknown-age text.
- Without `?now`, the off-season variant appears.
- No German strings or Berlin references anywhere in the panel.

---

### M6 — Accounts, watering and adoption loop

Outcome: the full volunteer loop works locally.

- [ ] **M6.1** Verify every auth flow against local Supabase; emails arrive in the local mail UI (Inbucket/Mailpit — see `npx supabase status` for the URL): register (with `signup_username`), confirm, log in/out, forgot/reset password (`VITE_RECOVERY_AUTH_REDIRECT_URL`), change username, change email, change password, delete account. Fix what breaks.
- [ ] **M6.2** `use-water-tree.tsx`: remove `username` from the insert; the watering dialog's amount input uses `max={city.maxWateringLitres}`; the date input's default and `max` are today in `city.timeZone` (use `toCityDateString`); after success refresh tree waterings, user waterings and the trees layer.
- [ ] **M6.3** `adopt-tree-store.tsx`: read the adoption count from `useTreesLayerStore` activity (no `get_watered_and_adopted`); refresh the layer after adopt/unadopt.
- [ ] **M6.4** `profile-store.tsx`: select `id, common_name, botanical_name, trees_watered ( id, amount )`; adopted-tree cards show the common name (fallback botanical); overview totals still correct.
- [ ] **M6.5** Last waterings list: username from `waterings_for_tree`; null → "Former user"; users can delete only their own entries.
- [ ] **M6.6** Make sure DB username constraints (Appendix D) match `profile/validation/validation.ts`; adjust the migration (new migration file) if they differ.
- [ ] **M6.7** Register form: add one line "Your username and your waterings (amount and date) are visible to everyone."

**Acceptance — manual checklist (record results in the Progress log)**

1. Sign up → confirmation email → confirm → logged in.
2. With `?now=2027-01-15`, open an orange tree → "I watered" 50 L → list shows the entry → tree turns yellow without reload.
3. Water it to above the target → turns green.
4. Delete one watering → colour updates.
5. Adopt → adoption count +1 → appears in Profile → Adopted trees → click jumps to the tree.
6. Log out → panel still shows waterings with your username; "I watered" asks you to log in.
7. Delete account → username shows "Former user"; adoption gone.

---

### M7 — Content, branding and legal

Outcome: everything a visitor reads is about Perth, credits upstream and the data owners, and is ready for human review.

- [ ] **M7.1** Rewrite `en.ts` Berlin copy, Australian spelling:
  - splash (in-season and off-season variants, no Slack, no "your city too?" pitch);
  - loading text with the real tree count (interpolate `treeCount`);
  - legend, navbar labels;
  - Info/FAQ following the outline in Appendix F;
  - share text; profile placeholders (no `xyz@ts.berlin`); units "litres".
- [ ] **M7.2** Credits (`info/credits.tsx`): remove Berlin logos/links; add "Built on Gieß den Kiez by Technologiestiftung Berlin and CityLAB Berlin (MIT licence)" with link, plus data credits (City of Perth, Open-Meteo, Mapbox/OpenStreetMap).
- [ ] **M7.3** Acknowledgement of Country on the Info page and in the splash footer. Draft: "We acknowledge the Whadjuk Noongar people as the Traditional Custodians of the land on which this project operates, and pay our respects to Elders past and present." Mark `TODO(confirm): wording to be reviewed`.
- [ ] **M7.4** Privacy notice (section on the Info page or `/privacy` route): what is collected (email, username, waterings, adoptions), what is public (username, watering amount and date per tree), where it is stored (Supabase, Sydney region), how to delete (Profile → Delete account), contact email (`TODO(confirm)`). Mark `TODO(confirm): needs review; not legal advice`.
- [ ] **M7.5** Replace the imprint/privacy links in `en.ts` (currently Technologiestiftung URLs) with the new privacy section and a contact link.
- [ ] **M7.6** Email templates (`templates/email/*.html`): rebrand all five with the app name, English copy, no Berlin logos; reference them in `supabase/config.toml` (`[auth.email.template.*]`) for local dev.
- [ ] **M7.7** Branding: `<title>`, meta description, Open Graph tags in `index.html` from the app name; replace `public/images/social_media.jpg` and favicon with simple placeholders; replace logo usages with a text wordmark.
- [ ] **M7.8** Final sweep: `grep -rniE "berlin|bezirk|kiez|giessdenkiez|gieß|citylab|technologiestiftung|ts\.berlin" src index.html templates` → only attribution lines remain.
- [ ] **M7.9** Collect every `TODO(confirm)` (`grep -rn "TODO(confirm)" .`) and make sure each is in Open questions.

**Acceptance**

- The sweep in M7.8 is clean apart from attribution.
- Open questions list is complete.

---

### M8 — Deploy, smoke tests and CI

Outcome: a public URL the humans can demo.

- [ ] **M8.1** _(human)_ Create a Supabase project in **ap-southeast-2 (Sydney)**. _(agent)_ `npx supabase link --project-ref <ref>`, `npx supabase db push`, then `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run import:trees -- --push`.
- [ ] **M8.2** _(human, agent writes the checklist)_ Supabase Auth settings: Site URL = production URL; redirect URL `<prod>/profile/reset-password`; paste the email templates; **configure custom SMTP** (e.g. Resend, Postmark, SES). Supabase's built-in email sender is rate-limited and meant for testing only, so external users will not reliably get confirmation emails without custom SMTP.
- [ ] **M8.3** _(human)_ Vercel project from the fork, framework preset Vite, environment variables from Appendix E.
- [ ] **M8.4** _(human)_ Mapbox: restrict the public token to the production domain and `http://localhost:5173`.
- [ ] **M8.5** Playwright smoke tests (local Supabase), reusing the kept helpers. To read the tree count, expose `data-tree-count` on the map container (test mode only).
  - map loads with ≥ 15,000 trees;
  - `/map?treeId=<known id>` opens the panel;
  - sign up via the local mail UI and log in;
  - water a tree and see the status change;
  - delete the account.

  Add a `test:e2e` script; do not put it in CI unless CI can start Supabase.

- [ ] **M8.6** CI: Prettier check, lint, `tsc --noEmit`, unit tests and build on every PR and on push to `main`/`prototype`.
- [ ] **M8.7** README runbook: local setup (Docker, `supabase start`, `.env`), data refresh (`npm run import:trees` → commit GeoJSON → `--push` → redeploy), deployment steps.
- [ ] **M8.8** Production smoke checklist (record in Progress log): desktop Chrome/Firefox/Safari + one Android + one iPhone; sign-up email arrives; watering works; deep link works; load time acceptable on 4G.

**Acceptance:** Definition of done in section 1 is fully ticked.

---

## 6. Backlog (after the prototype)

| ID  | Item                                   | Notes                                                                                                                                                       |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Heatwave nudges to adopters            | Open-Meteo `temperature_2m_max` forecast ≥ threshold (e.g. 38 °C, confirm) → email adopters of JUNIOR trees; Supabase scheduled edge function or `pg_cron`. |
| B2  | Evapotranspiration-based water balance | Use `et0_fao_evapotranspiration` already fetched in M4.1; deficit = ET₀ × crop factor × canopy area − rain − watering.                                      |
| B3  | Contact another waterer                | Port upstream `contact_requests` table, `submit_contact_request` / `check_contact_request` edge functions (nodemailer + SMTP) and the UI removed in M0.9.   |
| B4  | Stats lite                             | Counts, monthly waterings, top species; skip the density map.                                                                                               |
| B5  | Multi-council support                  | `council` column, per-council config (age bands, report URL, season), more datasets (ask South Perth, Vincent, Bayswater for inventories).                  |
| B6  | Water source and verge reticulation    | Log source (scheme / bore / greywater / rainwater tank); "this verge is reticulated" flag.                                                                  |
| B7  | MapLibre + self-hosted tiles           | Remove Mapbox token dependency and per-load costs.                                                                                                          |
| B8  | Automated data refresh                 | Weekly GitHub Action running `import:trees --push` and committing the GeoJSON.                                                                              |
| B9  | Species-aware targets                  | Different targets for drought-adapted natives vs exotics (needs expert input).                                                                              |
| B10 | Habitat badges                         | E.g. black cockatoo food trees (Marri, Jarrah…) — list to be confirmed with experts.                                                                        |
| B11 | Privacy-friendly analytics             | Only if a partner needs numbers.                                                                                                                            |
| B12 | Problem reporting via Snap Send Solve  | If the council prefers it.                                                                                                                                  |

---

## 7. Open questions for humans

Owner: **C** = colleague (product/community), **U** = you (developer), **Council** = ask the City of Perth.

| ID  | Question                                                                                                                     | Owner       | Used in                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------- |
| Q1  | App name and short tagline?                                                                                                  | C           | `city.appName`, M7                |
| Q2  | Watering season months for volunteers (placeholder Nov–Apr)? City waters new trees in spring, summer and autumn.             | Council / C | `city.wateringSeason`             |
| Q3  | Age bands: City waters for the first 2 years — until what age do trees benefit most from residents (placeholder 5)?          | Council     | `city.ageBands`                   |
| Q4  | Target litres per 30 days for JUNIOR trees in summer (placeholder 400 L)? Any official hand-watering guidance for residents? | Council     | `city.targetLitresPer30Days`, FAQ |
| Q5  | Is 2019-05-10 the inventory capture date? Are 2017-07-02 (308 trees) and 2025-09-22 (201 trees) real planting dates?         | Council     | import rules                      |
| Q6  | Which URL should "Report a problem" link to?                                                                                 | Council / C | `city.reportProblemUrl`           |
| Q7  | Licence version for attribution: CC BY 3.0 AU (data.gov.au) or CC BY 4.0 (WA catalogue)?                                     | U           | attribution                       |
| Q8  | Privacy notice text and contact email; Acknowledgement of Country wording.                                                   | C           | M7.3, M7.4                        |
| Q9  | Should usernames be public on watering lists?                                                                                | C / U       | M6.7                              |
| Q10 | Species card texts — who reviews them?                                                                                       | C           | M5.5                              |
| Q11 | Open-Meteo free tier is for non-commercial use — fine for the prototype; what if a council deploys it?                       | U           | D6                                |

---

## Appendix A — `src/config/city.ts` (proposed)

```ts
// All City-of-Perth-specific domain constants live here.
// Deployment-specific values (keys, URLs, map centre/zoom) live in .env.

export const city = {
	appName: "Perth Tree Watering", // TODO(confirm): working title (Q1)
	councilName: "City of Perth",
	timeZone: "Australia/Perth",
	locale: "en-AU",

	// Open-Meteo point for rain; Perth CBD.
	weatherPoint: { lat: -31.9523, lng: 115.8613 },

	// Inclusive, 1-based months; may wrap over New Year.
	// TODO(confirm): volunteer watering season (Q2)
	wateringSeason: { start: { month: 11, day: 1 }, end: { month: 4, day: 30 } },

	// The City waters new trees for their first two years (City of Perth Urban Forest FAQ).
	// TODO(confirm): upper bound of "needs residents' help" (Q3)
	ageBands: { councilCareMaxYears: 2, needsHelpMaxYears: 5 },

	// Date the inventory was bulk-captured; DATE_PLANTED on this day means "planted before".
	// TODO(confirm): Q5
	inventoryCaptureDate: "2019-05-10",

	// Litres per 30 days a tree should receive (rain + waterings).
	// Only JUNIOR drives the map colour. Berlin uses 200 L for juniors; Perth summers have
	// roughly double the evaporative demand, hence the placeholder.
	// TODO(confirm): Q4
	targetLitresPer30Days: { BABY: 200, JUNIOR: 400, SENIOR: 300, UNKNOWN: 200 },

	// 1 mm of rain on 1 m² = 1 litre (upstream's implicit assumption).
	rainCatchmentM2: 1,

	// Sanity cap for a single watering entry (also enforced in the DB).
	maxWateringLitres: 1000,

	// TODO(confirm): exact page (Q6)
	reportProblemUrl: "https://perth.wa.gov.au/",

	dataAttribution: {
		text: "Tree data © City of Perth, CC BY", // TODO(confirm): licence version (Q7)
		url: "https://www.data.gov.au/data/dataset/perth-trees-in-the-city",
	},
} as const;
```

## Appendix B — Tree data source (City of Perth)

**Layer:** `https://services7.arcgis.com/v8XBa2naYNQGOjlG/arcgis/rest/services/PKS_AST_TREESMASTER_PV/FeatureServer/0`
`maxRecordCount` = 2000; supports `JSON`, `geoJSON`, `PBF`.

**Count:** `<layer>/query?where=1%3D1&returnCountOnly=true&f=json`

**Page:** `<layer>/query?where=1%3D1&outFields=*&outSR=4326&orderByFields=OBJECTID&resultOffset=<n>&resultRecordCount=2000&f=geojson`

**Fields**

| Field                    | Type                 | Notes                                      |
| ------------------------ | -------------------- | ------------------------------------------ |
| `OBJECTID`               | OID                  | Row ID (alias `MI_PRINX`)                  |
| `TREE_ID`                | Integer              | Council asset ID; 6 nulls, 3 duplicates    |
| `DATE_PLANTED`           | Date (epoch ms, UTC) | See precision rules                        |
| `SUBURB`                 | String               | Inconsistent casing/whitespace; some empty |
| `BOTANICAL_NAME`         | String               | e.g. `Platanus x acerifolia`               |
| `COMMON_NAME`            | String               | e.g. `London Plane`                        |
| `FAMILY`                 | String               |                                            |
| `TREE_HEIGHT`            | Double               | Metres; often null                         |
| `RARE_SPECIES`           | String               | `"Yes"`/`"No"`                             |
| `HISTORIC_SIGNIFICANCE`  | String               | `"Yes"`/`"No"`                             |
| `COMMUNITY_SIGNIFICANCE` | String               | `"Yes"`/`"No"`                             |
| `SIGNIFICANT_GROUP`      | String               | `"Yes"`/`"No"`                             |
| `RETIRED`                | Date                 | Skip records where set                     |

**Normalisation rules**

1. Skip features with `RETIRED` set, or without valid point geometry (lng 115–117, lat −33 to −31).
2. `id` = `String(TREE_ID)`; if `TREE_ID` is null → `obj-<OBJECTID>`; if the ID was already used → `<TREE_ID>-<OBJECTID>`. Keep `source_object_id = OBJECTID`.
3. Convert `DATE_PLANTED` to a date in `Australia/Perth`, then:
   - null → `planted_date = null`, precision `unknown`;
   - equals `city.inventoryCaptureDate` → `null`, `before_2019`;
   - year < 1901 or after today → `null`, `unknown`;
   - month = 1 and day = 1 → keep date, `year`;
   - otherwise keep date, `day`.
4. `genus` = first token of `BOTANICAL_NAME`, capitalised; null if empty or `unknown`/`vacant`-like values (log the distinct values you discard).
5. `suburb` = trimmed, Title Case (`"EAST PERTH "` → `East Perth`); empty → null.
6. Flags: `"Yes"` → `true`, anything else → `false`.
7. Trim all strings; empty → null.

**Sample rows (fixtures)**

```json
{"attributes":{"OBJECTID":1,"TREE_ID":1918,"DATE_PLANTED":1186531200000,"SUBURB":"PERTH","BOTANICAL_NAME":"Quercus palustris","COMMON_NAME":"Pin Oak","FAMILY":"Fagaceae","TREE_HEIGHT":1.5,"RARE_SPECIES":"No","HISTORIC_SIGNIFICANCE":"No","COMMUNITY_SIGNIFICANCE":"No","SIGNIFICANT_GROUP":"No","RETIRED":null},"geometry":{"x":115.86177974755284,"y":-31.958575789189467}}
{"attributes":{"OBJECTID":3,"TREE_ID":1920,"DATE_PLANTED":1557458487000,"SUBURB":"Perth","BOTANICAL_NAME":"Cinnamomum camphora","COMMON_NAME":"Camphor Laurel","FAMILY":"Lauraceae","TREE_HEIGHT":null,"RARE_SPECIES":"No","HISTORIC_SIGNIFICANCE":"No","COMMUNITY_SIGNIFICANCE":"No","SIGNIFICANT_GROUP":"No","RETIRED":null},"geometry":{"x":115.86185875348377,"y":-31.958713771029146}}
{"attributes":{"OBJECTID":4,"TREE_ID":1921,"DATE_PLANTED":1557458487000,"SUBURB":"Perth","BOTANICAL_NAME":"Araucaria heterophylla","COMMON_NAME":"Norfolk Island Pine","FAMILY":"Araucariaceae","TREE_HEIGHT":null,"RARE_SPECIES":"No","HISTORIC_SIGNIFICANCE":"No","COMMUNITY_SIGNIFICANCE":"No","SIGNIFICANT_GROUP":"No","RETIRED":null},"geometry":{"x":115.86168373112375,"y":-31.95895382742853}}
```

(These are the `f=json` shape. With `f=geojson`, attributes arrive as `properties` and geometry as `coordinates` — handle the GeoJSON shape in code and convert fixtures accordingly. `1557458487000` = 2019-05-10 in Perth → `before_2019`. `1186531200000` = 2007-08-08 → `day`.)

## Appendix C — Weather (Open-Meteo)

```
https://api.open-meteo.com/v1/forecast
  ?latitude=-31.9523&longitude=115.8613
  &daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max
  &past_days=30&forecast_days=1
  &timezone=Australia%2FPerth
```

- `rain30dMm` = sum of `daily.precipitation_sum` over the returned days (30 past days + today); treat nulls as 0.
- Keep `et0_fao_evapotranspiration` and `temperature_2m_max` in the store for B1/B2.
- No API key. Free tier is for non-commercial use with fair-use limits; one call per session is well within them.
- Attribution required: "Weather data by Open-Meteo.com" (CC BY 4.0).

## Appendix D — Database schema sketch

Port intent from upstream `giessdenkiez-de-postgres-api/supabase/migrations/` (notably `*_waterings_via_rpc.sql`, `*_signup_set_sername.sql`, `*_remove_account.sql`, `*_add_is_username_taken_function.sql`, `*_fix_rls_trees_adopted.sql`). This is a sketch: make it correct, idempotent where cheap, and consistent with `profile/validation/validation.ts`.

```sql
-- trees: read-only for clients, written by the import script (service role)
create table public.trees (
  id text primary key,
  source_object_id integer,
  botanical_name text,
  common_name text,
  family text,
  genus text,
  planted_date date,
  planted_date_precision text not null
    check (planted_date_precision in ('day','year','before_2019','unknown')),
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
create policy "trees readable by everyone" on public.trees
  for select to anon, authenticated using (true);

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
  -- + length/format checks mirroring validation.ts
);
alter table public.profiles enable row level security;
create policy "read own profile"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

-- on signup: username from metadata (signup_username) or email local part;
-- if taken, append left(replace(new.id::text, '-', ''), 6)  -- no hyphen: the username rules allow letters and digits only
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$ ... $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- waterings
create table public.trees_watered (
  id bigint generated always as identity primary key,
  tree_id text not null references public.trees(id),
  uuid uuid references auth.users(id) on delete set null,
  amount numeric not null check (amount > 0 and amount <= 1000),
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.trees_watered (tree_id);
create index on public.trees_watered ("timestamp");
alter table public.trees_watered enable row level security;
create policy "insert own waterings" on public.trees_watered for insert to authenticated with check (uuid = auth.uid());
create policy "select own waterings" on public.trees_watered for select to authenticated using (uuid = auth.uid());
create policy "delete own waterings" on public.trees_watered for delete to authenticated using (uuid = auth.uid());

-- adoptions
create table public.trees_adopted (
  id bigint generated always as identity primary key,
  tree_id text not null references public.trees(id),
  uuid uuid not null references auth.users(id) on delete cascade,
  unique (tree_id, uuid)
);
alter table public.trees_adopted enable row level security;
create policy "insert own adoptions" on public.trees_adopted for insert to authenticated with check (uuid = auth.uid());
create policy "select own adoptions" on public.trees_adopted for select to authenticated using (uuid = auth.uid());
create policy "delete own adoptions" on public.trees_adopted for delete to authenticated using (uuid = auth.uid());

-- RPCs (security definer, search_path pinned)
-- waterings_for_tree(t_id text) → (id, tree_id, amount, "timestamp", username)  -- left join profiles
-- waterings_for_user(u_id text) → same shape, only when u_id = auth.uid()::text
-- tree_activity_30d() → (tree_id, watered_litres_30d, watering_count_30d, adopted_count)
--     full outer join of 30-day watering sums and all-time adoption counts
-- is_username_taken(given_username text) → boolean
-- remove_account() → void: delete from auth.users where id = auth.uid()
-- grants: anon+authenticated → waterings_for_tree, tree_activity_30d, is_username_taken
--         authenticated only → waterings_for_user, remove_account
```

**Frontend `TreeCoreData` (M1.8)** mirrors the `trees` row: `id, botanical_name, common_name, family, genus, planted_date, planted_date_precision, suburb, height_m, is_rare, is_heritage, is_significant, is_significant_group, lat, lng`.

## Appendix E — Environment variables

| Variable                                                                                                               | Where              | Value / notes                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_MAPBOX_API_KEY`                                                                                                  | frontend           | Public token, URL-restricted                                                                                                         |
| `VITE_MAPBOX_STYLE_URL`                                                                                                | frontend           | `mapbox://styles/mapbox/standard` (or light style)                                                                                   |
| `VITE_MAPBOX_API_ENDPOINT`                                                                                             | frontend           | `https://api.mapbox.com`                                                                                                             |
| `VITE_MAP_BOUNDING_BOX`                                                                                                | frontend           | From import report: `minLng,minLat,maxLng,maxLat`                                                                                    |
| `VITE_MAP_CENTER_LNG` / `VITE_MAP_CENTER_LAT`                                                                          | frontend           | From import report (≈ 115.86 / −31.955)                                                                                              |
| `VITE_MAP_MIN_ZOOM_LEVEL` / `VITE_MAP_INITIAL_ZOOM_LEVEL` / `VITE_MAP_MAX_ZOOM_LEVEL` / `VITE_MAP_LOCATION_ZOOM_LEVEL` | frontend           | 12 / 14 / 20 / 17 (tune visually)                                                                                                    |
| `VITE_MAP_PITCH_DEGREES`                                                                                               | frontend           | 45                                                                                                                                   |
| `VITE_TREES_GEOJSON_URL`                                                                                               | frontend           | `/data/trees.geojson` (NEW)                                                                                                          |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`                                                                         | frontend           | Local or hosted                                                                                                                      |
| `VITE_BASE_URL` / `VITE_RECOVERY_AUTH_REDIRECT_URL`                                                                    | frontend           | `${VITE_BASE_URL}/profile/reset-password`                                                                                            |
| `VITE_IS_TEMPORARY_BANNER_VISIBLE`                                                                                     | frontend           | `false`                                                                                                                              |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`                                                                           | scripts/tests only | **Never `VITE_`**                                                                                                                    |
| Removed                                                                                                                | —                  | `VITE_MAPBOX_TREES_TILESET_URL`, `VITE_MAPBOX_TREES_TILESET_LAYER`, `VITE_MAP_PUMPS_SOURCE_URL`, `VITE_BEZIRKE_URL`, `VITE_MATOMO_*` |

## Appendix F — Content guidelines and FAQ outline

**Style:** Australian English (litres, colour, neighbour), plain and friendly, short sentences, no German loanwords. Never state council policy, litre amounts or water rules without a source; otherwise `TODO(confirm)`.

**FAQ outline**

1. What is this? (Volunteers help young City of Perth street trees through hot, dry summers.)
2. Why do young trees need help in Perth? (Long dry summers; the City waters new trees for their first two years — cite the City of Perth Urban Forest FAQ.)
3. Which trees should I water? (Orange first, then yellow; explain the colours and age bands from config.)
4. How much and how should I water? `TODO(confirm)` — council/Water Corporation guidance.
5. What do the colours and the ring mean? (Rain from Open-Meteo for the last 30 days + logged waterings vs. target.)
6. Where does the data come from? Why is a tree missing or wrong? (City of Perth inventory of public trees in the City of Perth area only; private trees excluded; report errors to the City.)
7. What is "planted before 2019"? (Many records carry the 2019 inventory date instead of a planting date.)
8. What is public about me? (Username, watering amount and date.) How do I delete my account?
9. Who made this? (Credits, built on Gieß den Kiez.)
10. Contact. `TODO(confirm)`

## Appendix G — Sources

- City of Perth "Trees in the City" dataset: https://www.data.gov.au/data/dataset/perth-trees-in-the-city
- WA data catalogue entry: https://catalogue.data.wa.gov.au/dataset/perth-xb-trees-in-the-city-app
- City of Perth Urban Forest Plan FAQ (City waters new trees for two years): https://engage.perth.wa.gov.au/urban-forest-plan/faqs
- City of Perth trees page: https://perth.wa.gov.au/community/parks-and-reserves/trees
- Upstream frontend: https://github.com/technologiestiftung/giessdenkiez-de
- Upstream backend: https://github.com/technologiestiftung/giessdenkiez-de-postgres-api
- Open-Meteo: https://open-meteo.com/

---

## 8. Glossary

- **Age class** — BABY (watered by the City), JUNIOR (needs residents), SENIOR (established), UNKNOWN.
- **Need status** — the per-tree result of `getNeedStatus`, drives the map colour.
- **Watering season** — months in which volunteer watering is meaningful (Southern-Hemisphere summer).
- **Layer refresh** — re-fetch `tree_activity_30d`, re-enrich features, `setData` on the Mapbox source.

## 9. Progress log

Append one line per milestone (date, milestone, result, notes).

| Date       | Milestone | Result | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-22 | M0        | pass   | Baseline (lint, tsc, unit, build) was green before changes. Work is on local branch `prototype` (not pushed). TS 6 no longer auto-includes `@types/*`, so `tsconfig.json` has `"types": ["geojson"]` and `@types/geojson` is a devDependency (it used to come in via `@types/d3`). The Info/FAQ page still has Berlin copy (pump sentences removed); the full rewrite is M7.1. Roadmap moved to `docs/`; `README_DEV.md` and the Berlin docs were removed (runbook comes in M8.7).                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-22 | M1        | pass   | `src/config/city.ts` and `src/domain/{time,season,tree-age,water-needs,tree-status}.ts` with 45 unit tests. `TreeAgeClassification` is now a const object plus a type derived from domain `AgeClass` (same values). `computeWaterNeeds` clamps the shares so rain + watering + other never exceed 1 (upstream went negative when rain >= target). Berlin hooks are thin wrappers; rain is wired as 0 until M4.1. `tree-age-grouped.tsx` was removed early and `BarGraph` takes `counts` (wired in M4.7). The circle-style district block was removed; the full rewrite is M4.6.                                                                                                                                                                                                                                                                        |
| 2026-10-22 | M2        | pass   | Import run against the live service: 17,118 fetched and kept (0 skipped, 3 duplicate IDs); precision: day 4,949, year 371 (= 5,320), before_2019 11,382, unknown 416 (+4 % vs the ~400 estimate, within tolerance). Top genera: Eucalyptus 2,606, Platanus 2,211, Corymbia 1,878, Melaleuca 1,444, Jacaranda 1,050, Lophostemon 974, Agonis 748, Casuarina 628, Phoenix 480, Ficus 452. 7 botanical names ("Unknown species") yielded no genus. GeoJSON 3.62 MB. bbox 115.810883,-31.990038,115.887784,-31.942122, centre 115.8493,-31.9661 (in `.env.sample`). Genus differs from Appendix expectations because `Eucalyptus`/`Corymbia`/`Melaleuca` are genus-level aggregates of the species listed there. Scripts have their own `scripts/tsconfig.json` (`npx tsc --noEmit -p scripts/tsconfig.json`).                                             |
| 2026-10-22 | M3        | pass   | `supabase/config.toml` uses ports 57320-57329 (API 57321, DB 57322, Studio 57323, mail UI 57324) and project id `perth-tree-watering` so it can run beside other local Supabase stacks; `.env.sample` points there. Realtime, storage, edge runtime and analytics are disabled. Email confirmation is on, minimum password 8. `db reset`: 17,118 trees (11,382 before_2019) = import report. `npm run test:integration` (19 tests) passes. Corrections to Appendix D: the suffix for taken usernames has no hyphen (the DB check allows `[a-zA-Z0-9]` only, mirroring `validation.ts`), usernames are unique case-insensitively, and signup metadata is stripped to allowed characters. `trees_watered` also rejects timestamps more than a day in the future. `waterings_for_user` returns the same shape as `waterings_for_tree` (no `uuid` column). |
