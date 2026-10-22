import mapboxgl from "mapbox-gl";
import React, { useRef } from "react";
import { useMapSetup } from "./hooks/use-map-setup";
import { MapAttribution } from "./map-attribution";
import { useTreesLayerStore } from "./trees-layer-store";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY;

export const Map: React.FC = () => {
	const mapContainer = useRef<HTMLDivElement | null>(null);

	useMapSetup(mapContainer);

	// Lets end-to-end tests wait for the trees without reading pixels.
	const treeCount = useTreesLayerStore((store) => store.treeCount);
	const isTestMode = import.meta.env.VITE_PW_TEST === "true";

	return (
		<div className="grid grid-cols-1 grid-rows-1">
			<div className="pointer-events-none z-[1000] col-start-1 row-start-1 flex items-end justify-end">
				<MapAttribution />
			</div>
			<div
				ref={mapContainer}
				className="col-start-1 row-start-1 h-svh"
				data-testid="map"
				data-tree-count={isTestMode ? treeCount : undefined}
			/>
		</div>
	);
};
