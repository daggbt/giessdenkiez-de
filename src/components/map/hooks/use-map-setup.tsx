import * as mapboxgl from "mapbox-gl";
import React, { useEffect } from "react";
import { useMapStore } from "../map-store";
import { useTreeCircleStyle } from "./use-tree-circle-style";
import { useMapConstants } from "./use-map-constants";
import { useMapTreesInteraction } from "./use-map-trees-interaction";
import { useMapInteraction } from "./use-map-interaction";
import { useTreesLayerStore } from "../trees-layer-store";
import { toMapData } from "../../../domain/tree-layer";
import { useFilterStore } from "../../filter/filter-store";
import { useErrorStore } from "../../../error/error-store";
import { useI18nStore } from "../../../i18n/i18n-store";
import { mapAreaBbox } from "../../../config/councils";

export function useMapSetup(
	mapContainer: React.MutableRefObject<HTMLDivElement | null>,
) {
	const {
		MAP_PITCH_DEGREES,
		MAP_MIN_ZOOM_LEVEL,
		MAP_MAX_ZOOM_LEVEL,
		MAP_LOCATION_ZOOM_LEVEL,
	} = useMapConstants();

	const { map, setMap, setIsMapLoaded, setMapError } = useMapStore();

	useMapTreesInteraction(map);
	useMapInteraction(map);

	const {
		circleRadius,
		circleOpacity,
		circleSortKey,
		circleStrokeColor,
		filteredCircleColor,
		circleStrokeWidth,
	} = useTreeCircleStyle();

	useEffect(() => {
		const container = mapContainer.current;
		if (!container) {
			return undefined;
		}

		let createdMap: mapboxgl.Map | undefined;
		let isRemoved = false;

		// React's StrictMode mounts, unmounts and mounts again in development.
		// Creating the map a moment later means only the second mount creates one:
		// one WebGL context and one billable Mapbox map load per page load.
		const timeoutId = setTimeout(() => {
			createdMap = createMap(container);
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			isRemoved = true;
			if (createdMap) {
				setMap(undefined);
				setIsMapLoaded(false);
				createdMap.remove();
			}
		};

		function createMap(element: HTMLDivElement): mapboxgl.Map | undefined {
			const isMobile = window.innerWidth < 768;

			const testMode = import.meta.env.VITE_PW_TEST === "true";

			// The position from the URL, or the configured default.
			const { lat, lng, zoom } = useFilterStore.getState();

			let initializedMap: mapboxgl.Map;
			try {
				initializedMap = new mapboxgl.Map({
					container: element,
					style: import.meta.env.VITE_MAPBOX_STYLE_URL,
					center: [lng, lat],
					zoom,
					minZoom: MAP_MIN_ZOOM_LEVEL,
					maxZoom: MAP_MAX_ZOOM_LEVEL,
					maxBounds: mapAreaBbox,
					pitch: isMobile ? 0 : MAP_PITCH_DEGREES,
					testMode,
				});
			} catch (error) {
				// Usually "Failed to initialize WebGL." (old devices, hardware
				// acceleration turned off).
				console.error("Mapbox could not start", error);
				setMapError(/webgl/i.test(String(error)) ? "unsupported" : "failed");
				return undefined;
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

				let hasTrees = true;
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
					hasTrees = false;
				}

				// The map may have been removed while the trees were loading.
				if (isRemoved) {
					return;
				}
				if (!hasTrees) {
					setIsMapLoaded(true);
					return;
				}

				initializedMap.addSource("trees", {
					type: "geojson",
					data: toMapData(useTreesLayerStore.getState().data.features),
					promoteId: "id",
					// Not for clusters: the map never zooms out that far. A clustered
					// source indexes points with Supercluster, which for 130,000 trees
					// needs a fraction of the memory of the default index (geojson-vt
					// keeps copies of the points for every zoom level it tiles).
					cluster: true,
					clusterMaxZoom: 8,
				});

				// Filters (from the URL, or picked before a reload of the map) are
				// active from the start.
				const {
					areOnlyAllAdoptedTreesVisible,
					areLastWateredTreesVisible,
					treeAgeRange,
					colorFilter,
				} = useFilterStore.getState();
				const filters = {
					areOnlyAllAdoptedTreesVisible,
					areLastWateredTreesVisible,
					treeAgeRange,
					colorFilter,
				};

				initializedMap.addLayer({
					id: "trees",
					type: "circle",
					source: "trees",
					// Clusters exist only below the minimum zoom; never draw one as a tree.
					filter: ["!", ["has", "point_count"]],
					layout: {
						"circle-sort-key": circleSortKey(filters),
					},
					paint: {
						"circle-pitch-alignment": "map",
						"circle-radius": circleRadius(filters),
						"circle-opacity": circleOpacity(filters),
						"circle-stroke-color": circleStrokeColor,
						"circle-color": filteredCircleColor(filters),
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

			// End-to-end tests check what the map renders through this handle.
			if (testMode) {
				(window as unknown as { __map: mapboxgl.Map }).__map = initializedMap;
			}

			return initializedMap;
		}
	}, [mapContainer]);
}
