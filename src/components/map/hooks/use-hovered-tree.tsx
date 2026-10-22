import { useEffect, useRef } from "react";
import * as mapboxgl from "mapbox-gl";
import { useTreeStore } from "../../tree-detail/stores/tree-store";
import { useShallow } from "zustand/react/shallow";
import { useMapStore } from "../map-store";

export function useHoveredTree(map: mapboxgl.Map | undefined) {
	const [hoveredTreeId, setHoveredTreeId] = useTreeStore(
		useShallow((store) => [store.hoveredTreeId, store.setHoveredTreeId]),
	);

	const isMapLoaded = useMapStore((store) => store.isMapLoaded);

	const hoveredTreeIdRef = useRef<string | undefined>(undefined);
	useEffect(() => {
		// Feature state needs the trees source, which exists once the map has loaded.
		if (!map || !isMapLoaded) {
			return;
		}

		if (hoveredTreeId) {
			map.setFeatureState(
				{
					id: hoveredTreeId,
					source: "trees",
				},
				{ hover: true },
			);
		}

		if (hoveredTreeIdRef.current) {
			map.setFeatureState(
				{
					id: hoveredTreeIdRef.current,
					source: "trees",
				},
				{ hover: false },
			);
		}

		hoveredTreeIdRef.current = hoveredTreeId;
	}, [hoveredTreeId, isMapLoaded]);

	return { hoveredTreeIdRef, setHoveredTreeId };
}
