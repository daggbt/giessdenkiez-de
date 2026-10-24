import * as mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useFilterStore } from "../../filter/filter-store";
import { useSearchStore } from "../../location-search/search-store";
import { useUrlState } from "../../router/store.tsx";
import { useMapStore } from "../map-store";
import { useTreeStore } from "../../tree-detail/stores/tree-store";
import { useHoveredTree } from "./use-hovered-tree";
import { useMapConstants } from "./use-map-constants";
import { useSelectedTree } from "./use-selected-tree";
import { useTreeCircleStyle } from "./use-tree-circle-style";

const treeFeatureId = (feature: mapboxgl.GeoJSONFeature) =>
	String(feature.properties?.id ?? feature.id);

/** The map stays mounted under the other pages, but only acts on the map page. */
const isOnMapPage = () => useUrlState.getState().url.pathname === "/map";

export function useMapTreesInteraction(map: mapboxgl.Map | undefined) {
	const { MAP_TREE_ZOOM_LEVEL, mapTreeZoomedInOffset } = useMapConstants();

	const { setHoveredTreeId } = useHoveredTree(map);
	const { setSelectedTreeId } = useSelectedTree(map);

	const treeCoreData = useTreeStore((store) => store.treeCoreData);

	const [
		treeAgeRange,
		areOnlyAllAdoptedTreesVisible,
		areLastWateredTreesVisible,
		colorFilter,
	] = useFilterStore(
		useShallow((store) => [
			store.treeAgeRange,
			store.areOnlyAllAdoptedTreesVisible,
			store.areLastWateredTreesVisible,
			store.colorFilter,
		]),
	);

	const { filteredCircleColor, circleRadius, circleOpacity, circleSortKey } =
		useTreeCircleStyle();

	// A clicked tree is already being flown to when its data arrives.
	const isEaseToStartedByUserClick = useRef(false);

	const isMapLoaded = useMapStore((store) => store.isMapLoaded);

	useEffect(() => {
		// The trees layer only exists once the map has loaded.
		if (!map || !isMapLoaded) {
			return;
		}
		const filters = {
			areOnlyAllAdoptedTreesVisible,
			areLastWateredTreesVisible,
			treeAgeRange,
			colorFilter,
		};
		map.setPaintProperty("trees", "circle-color", filteredCircleColor(filters));
		map.setPaintProperty("trees", "circle-radius", circleRadius(filters));
		map.setPaintProperty("trees", "circle-opacity", circleOpacity(filters));
		map.setLayoutProperty("trees", "circle-sort-key", circleSortKey(filters));
	}, [
		map,
		isMapLoaded,
		areOnlyAllAdoptedTreesVisible,
		areLastWateredTreesVisible,
		treeAgeRange,
		colorFilter,
	]);

	useEffect(() => {
		if (treeCoreData) {
			useSearchStore.getState().clearSearch();
			setSelectedTreeId(treeCoreData.id);

			if (isEaseToStartedByUserClick.current) {
				return;
			}

			map?.easeTo({
				center: [treeCoreData.lng, treeCoreData.lat],
				zoom: MAP_TREE_ZOOM_LEVEL,
				duration: 1500,
				essential: true,
				offset: mapTreeZoomedInOffset(window.innerWidth),
			});

			return;
		}
	}, [treeCoreData, map]);

	// Registered once per map and removed again, whichever page the app opens
	// on: the handlers check the current page themselves.
	useEffect(() => {
		// The trees layer only exists once the map has loaded.
		if (!map || !isMapLoaded) {
			return undefined;
		}

		const { setLat, setLng, setZoom, hideFilterView } =
			useFilterStore.getState();

		const onZoomEnd = () => {
			if (!isOnMapPage()) {
				return;
			}
			setZoom(map.getZoom());
			setLat(map.getCenter().lat);
			setLng(map.getCenter().lng);
		};

		const onMoveEnd = () => {
			if (!isOnMapPage()) {
				return;
			}
			setLat(map.getCenter().lat);
			setLng(map.getCenter().lng);
		};

		const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
			const treeFeature = e.features?.[0];
			const treeId = treeFeature ? treeFeatureId(treeFeature) : undefined;
			// Every mouse move would otherwise re-render whatever reads the store.
			if (treeId !== useTreeStore.getState().hoveredTreeId) {
				setHoveredTreeId(treeId);
			}
			map.getCanvas().style.cursor = treeFeature ? "pointer" : "";
		};

		const onClick = (e: mapboxgl.MapMouseEvent) => {
			const treeFeature = e.features?.[0];
			if (!treeFeature || !isOnMapPage()) {
				return;
			}

			hideFilterView();

			setSelectedTreeId(treeFeatureId(treeFeature));

			isEaseToStartedByUserClick.current = true;
			map.easeTo({
				center: [
					//@ts-expect-error no types for geometry.coordinates
					treeFeature.geometry.coordinates[0],
					//@ts-expect-error no types for geometry.coordinates
					treeFeature.geometry.coordinates[1],
				],
				zoom: MAP_TREE_ZOOM_LEVEL,
				essential: true,
				duration: 1500,
				offset: mapTreeZoomedInOffset(window.innerWidth),
			});
			map.once("moveend", () => {
				isEaseToStartedByUserClick.current = false;
			});
		};

		const onMouseLeave = () => {
			map.getCanvas().style.cursor = "";
			setHoveredTreeId(undefined);
		};

		map.on("zoomend", onZoomEnd);
		map.on("moveend", onMoveEnd);
		map.on("mousemove", "trees", onMouseMove);
		map.on("click", "trees", onClick);
		map.on("mouseleave", "trees", onMouseLeave);

		return () => {
			map.off("zoomend", onZoomEnd);
			map.off("moveend", onMoveEnd);
			map.off("mousemove", "trees", onMouseMove);
			map.off("click", "trees", onClick);
			map.off("mouseleave", "trees", onMouseLeave);
		};
	}, [map, isMapLoaded]);
}
