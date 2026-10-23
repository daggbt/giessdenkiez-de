import * as mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { useTreeStore } from "../../tree-detail/stores/tree-store";
import { useUrlState } from "../../router/store";
import { useShallow } from "zustand/react/shallow";
import { useMapStore } from "../map-store";

export function useSelectedTree(map: mapboxgl.Map | undefined) {
	const [addSearchParam, removeSearchParam] = useUrlState(
		useShallow((state) => [state.addSearchParam, state.removeSearchParam]),
	);

	const [selectedTreeId, setSelectedTreeId] = useTreeStore(
		useShallow((store) => [store.selectedTreeId, store.setSelectedTreeId]),
	);

	const isMapLoaded = useMapStore((store) => store.isMapLoaded);

	const selectedTreeIdRef = useRef<string | undefined>(undefined);

	const setSelectState = (id: string, isSelected: boolean) => {
		map?.setFeatureState(
			{
				id: id,
				source: "trees",
			},
			{ select: isSelected },
		);

		// Opening or closing a tree is a step that Back can undo.
		if (isSelected) {
			addSearchParam("treeId", id, { isNewHistoryEntry: true });
		} else {
			removeSearchParam("treeId", { isNewHistoryEntry: true });
		}
	};

	useEffect(() => {
		// Feature state needs the trees source, which exists once the map has loaded.
		if (!map || !isMapLoaded) {
			return;
		}

		if (selectedTreeIdRef.current) {
			setSelectState(selectedTreeIdRef.current, false);
		}

		if (selectedTreeId) {
			setSelectState(selectedTreeId, true);
		}

		selectedTreeIdRef.current = selectedTreeId;
	}, [selectedTreeId, isMapLoaded]);

	return { selectedTreeIdRef, setSelectedTreeId };
}
