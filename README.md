# Perth Tree Watering (prototype)

A prototype web app that helps residents water young street trees managed by the **City of Perth** (Western Australia). It shows the City's tree inventory on a map, coloured by water need. Residents can log waterings and adopt trees.

> Status: prototype. The working plan lives in [docs/perth-prototype-roadmap.md](./docs/perth-prototype-roadmap.md).

## Run locally

```bash
nvm use            # Node version from .nvmrc
npm ci
cp .env.sample .env  # then fill in the values
npm run dev
```

Useful scripts: `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run build`.

## Data sources

- Tree data © City of Perth, [Trees in the City](https://www.data.gov.au/data/dataset/perth-trees-in-the-city) (CC BY).
- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
- Map by Mapbox and OpenStreetMap contributors.

## Based on Gieß den Kiez

This project is a fork of [Gieß den Kiez](https://github.com/technologiestiftung/giessdenkiez-de) by [Technologiestiftung Berlin](https://www.technologiestiftung-berlin.de/) and [CityLAB Berlin](https://citylab-berlin.org/), released under the MIT licence. The original copyright notice is kept in [LICENSE](./LICENSE).
