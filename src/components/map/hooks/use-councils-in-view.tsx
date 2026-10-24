import * as mapboxgl from "mapbox-gl";
import { useEffect } from "react";
import { BoundingBox, councilsOverlapping } from "../../../config/councils";
import { useMapStore } from "../map-store";
import { reportFailedCouncils } from "../report-failed-councils";
import { useTreesLayerStore } from "../trees-layer-store";

/** The part of the map in view; with the map tilted, up to the top of the screen. */
export function boundsInView(map: mapboxgl.Map): BoundingBox {
	const bounds = map.getBounds();
	if (!bounds) {
		const { lng, lat } = map.getCenter();
		return [lng, lat, lng, lat];
	}
	return [
		bounds.getWest(),
		bounds.getSouth(),
		bounds.getEast(),
		bounds.getNorth(),
	];
}

/**
 * Loads the trees of every council the map shows part of whenever it comes to
 * rest, so that moving the map, searching or following a link into another
 * council's area brings up that council's trees. A council whose trees failed
 * to load is left to the council buttons, which try again.
 */
export function useCouncilsInView(map: mapboxgl.Map | undefined) {
	const isMapLoaded = useMapStore((store) => store.isMapLoaded);

	useEffect(() => {
		if (!map || !isMapLoaded) {
			return undefined;
		}

		const onMoveEnd = () => {
			const { councilStatus, loadCouncils } = useTreesLayerStore.getState();
			const notAskedFor = councilsOverlapping(boundsInView(map)).filter(
				(id) => councilStatus[id] === undefined,
			);
			if (notAskedFor.length > 0) {
				loadCouncils(notAskedFor).catch(reportFailedCouncils);
			}
		};

		// The map may have moved while it loaded its first trees, e.g. to a
		// linked tree of another council.
		onMoveEnd();
		map.on("moveend", onMoveEnd);
		return () => {
			map.off("moveend", onMoveEnd);
		};
	}, [map, isMapLoaded]);
}
