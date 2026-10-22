import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import { useTreesLayerStore } from "./components/map/trees-layer-store";
import "mapbox-gl/dist/mapbox-gl.css";
import "./index.css";

// The trees do not need the map, so fetch them while it starts up. The map's
// load handler awaits the same promise (or starts again after a failure) and
// reports errors.
useTreesLayerStore
	.getState()
	.load()
	.catch(() => {});

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
