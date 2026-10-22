import type { GeoJSONSource } from "mapbox-gl";
import { create } from "zustand";
import { supabaseClient } from "../../auth/supabase-client";
import { getNow } from "../../domain/time";
import {
	ActivityById,
	buildAgeHistogram,
	enrichFeatures,
	EnrichedTreeProperties,
	toFeatureCollection,
	TreeActivity,
	TreeFeature,
} from "../../domain/tree-layer";
import { useWeatherStore } from "../../weather/weather-store";
import { useMapStore } from "./map-store";
import type { FeatureCollection, Point } from "geojson";

export type TreesLayerStatus = "idle" | "loading" | "ready" | "error";

interface TreesLayerStore {
	status: TreesLayerStatus;
	/** The enriched features, as shown on the map. */
	data: FeatureCollection<Point, EnrichedTreeProperties>;
	activityById: ActivityById;
	treeCount: number;
	/** Number of trees per age bucket 0 to 10 (for the age filter). */
	ageHistogram: number[];
	/** Loads trees, activity and weather once; later calls reuse the result. */
	load: () => Promise<void>;
	/** Re-fetches the activity, re-enriches and updates the map source. */
	refresh: () => Promise<void>;
}

interface ActivityRow extends TreeActivity {
	tree_id: string;
}

const emptyData: FeatureCollection<Point, EnrichedTreeProperties> = {
	type: "FeatureCollection",
	features: [],
};

let baseFeatures: TreeFeature[] = [];
let loadPromise: Promise<void> | undefined;

async function fetchBaseFeatures(): Promise<TreeFeature[]> {
	const response = await fetch(import.meta.env.VITE_TREES_GEOJSON_URL);
	if (!response.ok) {
		throw new Error(`Failed to load trees: HTTP ${response.status}`);
	}
	const collection = (await response.json()) as FeatureCollection<
		Point,
		TreeFeature["properties"]
	>;
	return collection.features;
}

/** Returns undefined on failure: the map then keeps working with what it has. */
async function fetchActivity(): Promise<ActivityById | undefined> {
	const { data, error } = await supabaseClient.rpc("tree_activity_30d");
	if (error) {
		console.error("Failed to load tree activity", error);
		return undefined;
	}
	const activityById: ActivityById = {};
	for (const row of (data ?? []) as ActivityRow[]) {
		activityById[row.tree_id] = {
			// numeric and bigint columns can arrive as strings
			watered_litres_30d: Number(row.watered_litres_30d),
			watering_count_30d: Number(row.watering_count_30d),
			adopted_count: Number(row.adopted_count),
		};
	}
	return activityById;
}

function enrich(activityById: ActivityById) {
	const features = enrichFeatures(baseFeatures, {
		activityById,
		rain30dMm: useWeatherStore.getState().rain30dMm,
		now: getNow(),
	});
	return {
		activityById,
		data: toFeatureCollection(features),
		ageHistogram: buildAgeHistogram(features),
		treeCount: features.length,
	};
}

export const useTreesLayerStore = create<TreesLayerStore>()((set, get) => ({
	status: "idle",
	data: emptyData,
	activityById: {},
	treeCount: 0,
	ageHistogram: [],

	load: () => {
		loadPromise ??= (async () => {
			set({ status: "loading" });
			try {
				const [features, activityById] = await Promise.all([
					fetchBaseFeatures(),
					fetchActivity(),
					useWeatherStore.getState().load(),
				]);
				baseFeatures = features;
				set({ ...enrich(activityById ?? {}), status: "ready" });
			} catch (error) {
				loadPromise = undefined;
				set({ status: "error" });
				throw error;
			}
		})();
		return loadPromise;
	},

	refresh: async () => {
		if (get().status !== "ready") {
			return;
		}
		const activityById = await fetchActivity();
		if (!activityById) {
			return;
		}
		set(enrich(activityById));

		const source = useMapStore.getState().map?.getSource("trees") as
			GeoJSONSource | undefined;
		source?.setData(get().data);
	},
}));

// End-to-end tests read the computed tree state through this handle.
if (import.meta.env.VITE_PW_TEST === "true" && typeof window !== "undefined") {
	(
		window as unknown as { __treesLayer: typeof useTreesLayerStore }
	).__treesLayer = useTreesLayerStore;
}
