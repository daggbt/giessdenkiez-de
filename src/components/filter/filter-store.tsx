import { create } from "zustand";
import { MAX_AGE_BUCKET } from "../../domain/tree-layer";
import { replaceUrlSearchParam } from "../../utils/url-utils";
import { useUrlState } from "../router/store";
import { useMapConstants } from "../map/hooks/use-map-constants";
import { useTreeStore } from "../tree-detail/stores/tree-store";
export interface TreeAgeRange {
	min: number;
	max: number;
}

export interface FilterState {
	areOnlyAllAdoptedTreesVisible: boolean;
	areLastWateredTreesVisible: boolean;
	isFilterViewVisible: boolean;
	isSomeFilterActive: () => boolean;
	getAmountOfActiveFilters: () => number;
	lat: number;
	lng: number;
	zoom: number;
	initialTreeAgeRangeMin: number;
	initialTreeAgeRangeMax: number;
	treeAgeRange: TreeAgeRange;
	setTreeAgeRange: (min: number, max: number) => void;
	setAreOnlyAllAdoptedTreesVisible: (showOnlyAllAdoptedTrees: boolean) => void;
	setAreLastWateredTreesVisible: (showLastWateredTrees: boolean) => void;
	showFilterView: () => void;
	hideFilterView: () => void;
	toggleFilterView: () => void;
	resetFilters: () => void;
	setLat: (lat: number) => void;
	setLng: (lng: number) => void;
	setZoom: (zoom: number) => void;
	recoverUrlParams: () => void;
}

// Ages in whole years; the maximum means "this age and older".
const initialTreeAgeRange = {
	min: 0,
	max: MAX_AGE_BUCKET,
};

const treeAgeUrlKeyMin = "treeAgeMin";
const treeAgeUrlKeyMax = "treeAgeMax";
const areOnlyAllAdoptedTreesVisibleKey = "areOnlyAllAdoptedTreesVisible";
const areLastWateredTreesVisibleKey = "isLastWateredTreesVisible";
const zoomUrlKey = "zoom";
const latUrlKey = "lat";
const lngUrlKey = "lng";

const areOnlyAllAdoptedTreesVisibleSearch = new URL(
	window.location.href,
).searchParams.get(areOnlyAllAdoptedTreesVisibleKey);

const areLastWateredTreesVisibleSearch = new URL(
	window.location.href,
).searchParams.get(areLastWateredTreesVisibleKey);

const ageRangeMinSearch = new URL(window.location.href).searchParams.get(
	treeAgeUrlKeyMin,
);
const ageRangeMaxSearch = new URL(window.location.href).searchParams.get(
	treeAgeUrlKeyMax,
);

const zoomSearch = new URL(window.location.href).searchParams.get(zoomUrlKey);
const latSearch = new URL(window.location.href).searchParams.get(latUrlKey);
const lngSearch = new URL(window.location.href).searchParams.get(lngUrlKey);

/**
 * A number from the URL, or the fallback when it is missing or unusable: a
 * shared link with `lat=abc` must not break the map (or be written back).
 */
const numberFromUrl = (
	value: string | null,
	fallback: number,
	{ min = -Infinity, max = Infinity } = {},
) => {
	const parsed = value === null ? NaN : parseFloat(value);
	return Number.isFinite(parsed) && parsed >= min && parsed <= max
		? parsed
		: fallback;
};

const clampAge = (value: string | null, fallback: number) => {
	const parsed = value === null ? NaN : parseInt(value);
	return Number.isNaN(parsed)
		? fallback
		: Math.min(Math.max(parsed, 0), MAX_AGE_BUCKET);
};

function initialTreeAgeRangeFromUrl(): TreeAgeRange {
	const min = clampAge(ageRangeMinSearch, initialTreeAgeRange.min);
	const max = clampAge(ageRangeMaxSearch, initialTreeAgeRange.max);
	return { min: Math.min(min, max), max };
}

/**
 * The URL kept in `useUrlState` is updated synchronously, while
 * `window.location` only catches up once the debounced `pushState` fires.
 * Basing a param update on the browser URL therefore silently drops every
 * change made in the last few hundred milliseconds.
 */
const currentUrl = () => new URL(useUrlState.getState().url);

export const useFilterStore = create<FilterState>()((set, get) => ({
	initialTreeAgeRangeMin: initialTreeAgeRange.min,
	initialTreeAgeRangeMax: initialTreeAgeRange.max,

	treeAgeRange: initialTreeAgeRangeFromUrl(),

	areOnlyAllAdoptedTreesVisible: areOnlyAllAdoptedTreesVisibleSearch === "true",

	areLastWateredTreesVisible: areLastWateredTreesVisibleSearch === "true",

	isFilterViewVisible: false,

	lat: numberFromUrl(latSearch, useMapConstants().MAP_CENTER_LAT, {
		min: -90,
		max: 90,
	}),
	lng: numberFromUrl(lngSearch, useMapConstants().MAP_CENTER_LNG),
	zoom: numberFromUrl(zoomSearch, useMapConstants().MAP_INITIAL_ZOOM_LEVEL),
	isSomeFilterActive: () => {
		return (
			get().treeAgeRange.min !== initialTreeAgeRange.min ||
			get().treeAgeRange.max !== initialTreeAgeRange.max ||
			get().areLastWateredTreesVisible ||
			get().areOnlyAllAdoptedTreesVisible
		);
	},
	getAmountOfActiveFilters: () => {
		let amount = 0;

		if (get().areOnlyAllAdoptedTreesVisible) {
			amount = amount + 1;
		}

		if (
			get().treeAgeRange.min !== initialTreeAgeRange.min ||
			get().treeAgeRange.max !== initialTreeAgeRange.max
		) {
			amount = amount + 1;
		}

		if (get().areLastWateredTreesVisible) {
			amount = amount + 1;
		}

		return amount;
	},
	setAreOnlyAllAdoptedTreesVisible: (showOnlyAllAdoptedTrees) => {
		set({ areOnlyAllAdoptedTreesVisible: showOnlyAllAdoptedTrees });

		const updatedSearchParams = replaceUrlSearchParam(
			currentUrl(),
			areOnlyAllAdoptedTreesVisibleKey,
			[showOnlyAllAdoptedTrees ? "true" : "false"],
		);
		useUrlState.getState().setSearchParams(updatedSearchParams);
	},

	setAreLastWateredTreesVisible: (showLastWateredTrees) => {
		// The two filters are mutually exclusive, so switching this one on turns
		// the adopted-trees filter off - in the URL as well as in the store.
		set({ areLastWateredTreesVisible: showLastWateredTrees });
		set({ areOnlyAllAdoptedTreesVisible: false });

		const updatedSearchParams = replaceUrlSearchParam(
			currentUrl(),
			areLastWateredTreesVisibleKey,
			[showLastWateredTrees ? "true" : "false"],
		);
		useUrlState.getState().setSearchParams(updatedSearchParams);

		const withoutAdoptedTrees = replaceUrlSearchParam(
			currentUrl(),
			areOnlyAllAdoptedTreesVisibleKey,
			["false"],
		);
		useUrlState.getState().setSearchParams(withoutAdoptedTrees);
	},

	setTreeAgeRange: (min, max) => {
		set({ treeAgeRange: { min, max } });

		// Update search params in URL
		const updatedSearchParamsMin = replaceUrlSearchParam(
			currentUrl(),
			treeAgeUrlKeyMin,
			[get().treeAgeRange.min.toString()],
		);
		useUrlState.getState().setSearchParams(updatedSearchParamsMin);

		const updatedSearchParamsMax = replaceUrlSearchParam(
			currentUrl(),
			treeAgeUrlKeyMax,
			[get().treeAgeRange.max.toString()],
		);
		useUrlState.getState().setSearchParams(updatedSearchParamsMax);
	},

	toggleFilterView: () => {
		const shouldShow = !get().isFilterViewVisible;
		set({ isFilterViewVisible: shouldShow });
	},

	showFilterView: () => {
		set({ isFilterViewVisible: true });
	},

	hideFilterView: () => {
		set({ isFilterViewVisible: false });
	},

	resetFilters: () => {
		useUrlState.getState().removeSearchParam(treeAgeUrlKeyMin);
		useUrlState.getState().removeSearchParam(treeAgeUrlKeyMax);
		useUrlState.getState().removeSearchParam(areOnlyAllAdoptedTreesVisibleKey);
		useUrlState.getState().removeSearchParam(areLastWateredTreesVisibleKey);
		set({
			treeAgeRange: initialTreeAgeRange,
			areOnlyAllAdoptedTreesVisible: false,
			areLastWateredTreesVisible: false,
		});
	},

	setLat: (lat) => {
		useUrlState.getState().addSearchParam("lat", lat.toString());
		set({ lat });
	},

	setLng: (lng) => {
		useUrlState.getState().addSearchParam("lng", lng.toString());
		set({ lng });
	},

	setZoom: (zoom) => {
		useUrlState.getState().addSearchParam("zoom", zoom.toString());
		set({ zoom });
	},

	recoverUrlParams: () => {
		useUrlState.getState().addSearchParam("lat", get().lat.toString());
		useUrlState.getState().addSearchParam("lng", get().lng.toString());
		useUrlState.getState().addSearchParam("zoom", get().zoom.toString());
		useUrlState
			.getState()
			.addSearchParam(
				"areOnlyAllAdoptedTreesVisible",
				get().areOnlyAllAdoptedTreesVisible.toString(),
			);

		const updatedSearchParamsMin = replaceUrlSearchParam(
			currentUrl(),
			treeAgeUrlKeyMin,
			[get().treeAgeRange.min.toString()],
		);
		useUrlState.getState().setSearchParams(updatedSearchParamsMin);

		const updatedSearchParamsMax = replaceUrlSearchParam(
			currentUrl(),
			treeAgeUrlKeyMax,
			[get().treeAgeRange.max.toString()],
		);
		useUrlState.getState().setSearchParams(updatedSearchParamsMax);

		const treeId = useTreeStore.getState().selectedTreeId;
		if (treeId) {
			useUrlState.getState().addSearchParam("treeId", treeId);
		}
	},
}));
