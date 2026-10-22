import * as mapboxgl from "mapbox-gl";
import { useEffect } from "react";
import { useFilterStore } from "../../filter/filter-store";

export function useMapInteraction(map: mapboxgl.Map | undefined) {
	const { hideFilterView } = useFilterStore();

	useEffect(() => {
		if (!map) {
			return;
		}

		map.on("click", () => {
			hideFilterView();
		});
	}, [map]);
}
