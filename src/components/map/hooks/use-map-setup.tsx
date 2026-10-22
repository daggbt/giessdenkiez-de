import * as mapboxgl from "mapbox-gl";
import React, { useEffect } from "react";
import { useMapStore } from "../map-store";
import { useTreeCircleStyle } from "./use-tree-circle-style";
import { useMapConstants } from "./use-map-constants";
import { useMapTreesInteraction } from "./use-map-trees-interaction";
import { useMapInteraction } from "./use-map-interaction";
import { useTreesLayerStore } from "../trees-layer-store";
import { useFilterStore } from "../../filter/filter-store";
import { useErrorStore } from "../../../error/error-store";
import { useI18nStore } from "../../../i18n/i18n-store";

const BOUNDS_PADDING = 0.1;

/** The bounding box from the environment, padded by 10 % so edge trees are reachable. */
function getMaxBounds(): mapboxgl.LngLatBoundsLike | undefined {
	const box = (import.meta.env.VITE_MAP_BOUNDING_BOX ?? "")
		.split(",")
		.map(Number);
	if (box.length !== 4 || box.some(Number.isNaN)) {
		return undefined;
	}
	const [minLng, minLat, maxLng, maxLat] = box;
	const lngPadding = (maxLng - minLng) * BOUNDS_PADDING;
	const latPadding = (maxLat - minLat) * BOUNDS_PADDING;
	return [
		[minLng - lngPadding, minLat - latPadding],
		[maxLng + lngPadding, maxLat + latPadding],
	];
}

export function useMapSetup(
	mapContainer: React.MutableRefObject<HTMLDivElement | null>,
) {
	const {
		MAP_PITCH_DEGREES,
		MAP_MIN_ZOOM_LEVEL,
		MAP_MAX_ZOOM_LEVEL,
		MAP_INITIAL_ZOOM_LEVEL,
		MAP_CENTER_LNG,
		MAP_CENTER_LAT,
		MAP_LOCATION_ZOOM_LEVEL,
	} = useMapConstants();

	const { map, setMap, setIsMapLoaded, setMapError } = useMapStore();

	useMapTreesInteraction(map);
	useMapInteraction(map);

	const {
		circleRadius,
		circleOpacity,
		circleStrokeColor,
		filteredCircleColor,
		circleStrokeWidth,
	} = useTreeCircleStyle();

	useEffect(() => {
		if (!mapContainer.current) {
			return;
		}

		const isMobile = window.innerWidth < 768;

		const testMode = import.meta.env.VITE_PW_TEST === "true";

		let initializedMap: mapboxgl.Map;
		try {
			initializedMap = new mapboxgl.Map({
				container: mapContainer.current,
				style: import.meta.env.VITE_MAPBOX_STYLE_URL,
				center: [MAP_CENTER_LNG, MAP_CENTER_LAT],
				zoom: MAP_INITIAL_ZOOM_LEVEL,
				minZoom: MAP_MIN_ZOOM_LEVEL,
				maxZoom: MAP_MAX_ZOOM_LEVEL,
				maxBounds: getMaxBounds(),
				pitch: isMobile ? 0 : MAP_PITCH_DEGREES,
				testMode,
			});
		} catch (error) {
			// Usually "Failed to initialize WebGL." (old devices, hardware
			// acceleration turned off).
			console.error("Mapbox could not start", error);
			setMapError(/webgl/i.test(String(error)) ? "unsupported" : "failed");
			return;
		}

		initializedMap.dragRotate.disable();
		initializedMap.touchZoomRotate.disableRotation();

		let hasLoaded = false;
		initializedMap.on("error", (event) => {
			// Registering a handler stops mapbox-gl from logging errors itself.
			console.error("Mapbox error", event.error);
			// Before the first load, an error that is not about a single source's
			// tiles (a rejected token, an unreachable style) means no map will appear.
			if (!hasLoaded && !("sourceId" in event)) {
				setMapError("failed");
			}
		});

		initializedMap.on("load", async () => {
			hasLoaded = true;
			setMapError(undefined);

			try {
				await useTreesLayerStore.getState().load();
			} catch (error) {
				// Show the base map anyway, the toast explains what is missing.
				useErrorStore
					.getState()
					.handleError(
						useI18nStore.getState().i18n().common.defaultErrorMessage,
						error,
					);
				setIsMapLoaded(true);
				return;
			}

			initializedMap.addSource("trees", {
				type: "geojson",
				data: useTreesLayerStore.getState().data,
				promoteId: "id",
			});

			// Filters from the URL are active from the start.
			const {
				areOnlyAllAdoptedTreesVisible,
				areLastWateredTreesVisible,
				treeAgeRange,
			} = useFilterStore.getState();

			initializedMap.addLayer({
				id: "trees",
				type: "circle",
				source: "trees",
				paint: {
					"circle-pitch-alignment": "map",
					"circle-radius": circleRadius,
					"circle-opacity": circleOpacity,
					"circle-stroke-color": circleStrokeColor,
					"circle-color": filteredCircleColor({
						areOnlyAllAdoptedTreesVisible,
						areLastWateredTreesVisible,
						treeAgeRange,
					}),
					"circle-stroke-width": circleStrokeWidth,
				},
			});

			setIsMapLoaded(true);
		});

		const geoLocateControl = new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true,
			},
			// Draw an arrow next to the location dot to indicate which direction the device is heading.
			showUserHeading: true,
			showAccuracyCircle: false,
		});
		geoLocateControl.on("geolocate", function (e) {
			const { coords } = e as {
				coords: { longitude: number; latitude: number };
			};

			initializedMap.easeTo({
				center: [coords.longitude, coords.latitude],
				zoom: MAP_LOCATION_ZOOM_LEVEL,
				pitch: isMobile ? 0 : MAP_PITCH_DEGREES,
			});
		});
		initializedMap.addControl(geoLocateControl, "bottom-left");
		initializedMap.addControl(
			new mapboxgl.NavigationControl({
				showCompass: false,
				showZoom: !isMobile,
			}),
			"bottom-left",
		);

		setMap(initializedMap);
	}, [mapContainer]);
}
