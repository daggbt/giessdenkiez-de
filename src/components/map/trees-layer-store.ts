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
	/**
	 * Loads trees, activity and weather once; later calls reuse the result. The
	 * trees do not wait long for the weather: when it comes late they are
	 * re-coloured.
	 */
	load: () => Promise<void>;
	/** Re-fetches the activity, re-enriches and updates the map source. */
	refresh: () => Promise<void>;
}

/**
 * What `tree_activity_30d` returns: one object instead of rows, because
 * PostgREST cuts row results off at 1000.
 */
type ActivityResponse = Record<
	string,
	[litres30d: number, waterings30d: number, adoptions: number]
>;

const emptyData: FeatureCollection<Point, EnrichedTreeProperties> = {
	type: "FeatureCollection",
	features: [],
};

/**
 * Rain only turns some thirsty trees green, and it is the slowest and least
 * reliable source, so the trees are drawn without it after this long.
 */
const WEATHER_WAIT_MS = 1000;

let baseFeatures: TreeFeature[] = [];
let loadPromise: Promise<void> | undefined;

const wait = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

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
	try {
		const activityById: ActivityById = {};
		for (const [treeId, [litres, waterings, adoptions]] of Object.entries(
			(data ?? {}) as ActivityResponse,
		)) {
			activityById[treeId] = {
				watered_litres_30d: Number(litres),
				watering_count_30d: Number(waterings),
				adopted_count: Number(adoptions),
			};
		}
		return activityById;
	} catch (parseError) {
		// E.g. the app deployed before the database migration: draw the trees anyway.
		console.error("Unexpected tree activity data", parseError);
		return undefined;
	}
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

export const useTreesLayerStore = create<TreesLayerStore>()((set, get) => {
	/** Enriches the trees again and hands them to the map, if it shows them yet. */
	const update = (activityById: ActivityById) => {
		set(enrich(activityById));

		const source = useMapStore.getState().map?.getSource("trees") as
			GeoJSONSource | undefined;
		source?.setData(get().data);
	};

	return {
		status: "idle",
		data: emptyData,
		activityById: {},
		treeCount: 0,
		ageHistogram: [],

		load: () => {
			loadPromise ??= (async () => {
				set({ status: "loading" });
				const weather = useWeatherStore.getState().load();
				try {
					const [features, activityById] = await Promise.all([
						fetchBaseFeatures(),
						fetchActivity(),
						Promise.race([weather, wait(WEATHER_WAIT_MS)]),
					]);
					baseFeatures = features;
					set({ ...enrich(activityById ?? {}), status: "ready" });
				} catch (error) {
					loadPromise = undefined;
					set({ status: "error" });
					throw error;
				}

				if (useWeatherStore.getState().status === "loading") {
					weather.then(() => {
						if (useWeatherStore.getState().status === "ready") {
							update(get().activityById);
						}
					});
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
			update(activityById);
		},
	};
});

// End-to-end tests read the computed tree state through this handle.
if (import.meta.env.VITE_PW_TEST === "true" && typeof window !== "undefined") {
	(
		window as unknown as { __treesLayer: typeof useTreesLayerStore }
	).__treesLayer = useTreesLayerStore;
}
