import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import { useTreesLayerStore } from "./components/map/trees-layer-store";
import { useFilterStore } from "./components/filter/filter-store";
import { councilsOverlapping } from "./config/councils";
import "mapbox-gl/dist/mapbox-gl.css";
import "./index.css";

// The trees do not need the map, so fetch those of the council the map starts
// in (the City of Perth's unless the URL says otherwise) while it starts up.
// The map's load handler awaits the same fetch and reports errors.
const { lat, lng } = useFilterStore.getState();
useTreesLayerStore
	.getState()
	.loadCouncils(councilsOverlapping([lng, lat, lng, lat]))
	.catch(() => {});

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
