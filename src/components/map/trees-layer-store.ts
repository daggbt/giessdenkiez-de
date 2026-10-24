import type { GeoJSONSource } from "mapbox-gl";
import { create } from "zustand";
import { supabaseClient } from "../../auth/supabase-client";
import { CouncilId, councilIds } from "../../config/councils";
import { getNow } from "../../domain/time";
import {
	ActivityById,
	buildAgeHistogram,
	enrichFeatures,
	EnrichedTreeProperties,
	toFeatureCollection,
	toMapData,
	TreeFeature,
} from "../../domain/tree-layer";
import { useWeatherStore } from "../../weather/weather-store";
import { useMapStore } from "./map-store";
import type { FeatureCollection, Point } from "geojson";

export type TreesLayerStatus = "idle" | "loading" | "ready";

/** Whether a council's trees are being fetched, are on the map, or failed to load. */
export type CouncilTreesStatus = "loading" | "ready" | "error";

interface TreesLayerStore {
	status: TreesLayerStatus;
	/** The enriched features of the councils loaded so far, as shown on the map. */
	data: FeatureCollection<Point, EnrichedTreeProperties>;
	activityById: ActivityById;
	treeCount: number;
	/** Number of trees per age bucket 0 to 10 (for the age filter). */
	ageHistogram: number[];
	/** Councils without an entry have not been loaded or asked for. */
	councilStatus: Partial<Record<CouncilId, CouncilTreesStatus>>;
	/**
	 * Loads the trees of these councils and draws them with the ones loaded
	 * before; the first call also loads the activity and the weather. The trees
	 * do not wait long for the weather: when it comes late they are re-coloured.
	 * When a council's trees cannot be fetched, the others are drawn and the
	 * promise rejects; asking for that council again tries again.
	 */
	loadCouncils: (ids: CouncilId[]) => Promise<void>;
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

/** One GeoJSON file per council, written by `npm run import:trees`. */
const TREES_DATA_URL = import.meta.env.VITE_TREES_DATA_URL || "/data/trees";

/** The trees of each council fetched so far; the map shows all of them. */
const featuresByCouncil: Partial<Record<CouncilId, TreeFeature[]>> = {};
/** Fetches under way or done, so that no council's trees are fetched twice. */
const councilFetches = new Map<CouncilId, Promise<void>>();
/** The activity, and the wait for the weather: once for all councils. */
let sharedDataPromise: Promise<void> | undefined;

const loadedFeatures = () =>
	councilIds.flatMap((id) => featuresByCouncil[id] ?? []);

const wait = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchCouncilFeatures(
	council: CouncilId,
): Promise<TreeFeature[]> {
	const response = await fetch(`${TREES_DATA_URL}/${council}.geojson`);
	if (!response.ok) {
		throw new Error(
			`Failed to load the trees of ${council}: HTTP ${response.status}`,
		);
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
	const features = enrichFeatures(loadedFeatures(), {
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
		source?.setData(toMapData(get().data.features));
	};

	const setCouncilStatus = (council: CouncilId, status: CouncilTreesStatus) =>
		set({ councilStatus: { ...get().councilStatus, [council]: status } });

	const loadSharedData = () => {
		sharedDataPromise ??= (async () => {
			const weather = useWeatherStore.getState().load();
			const [activityById] = await Promise.all([
				fetchActivity(),
				Promise.race([weather, wait(WEATHER_WAIT_MS)]),
			]);
			set({ activityById: activityById ?? {} });

			if (useWeatherStore.getState().status === "loading") {
				weather.then(() => {
					if (useWeatherStore.getState().status === "ready") {
						update(get().activityById);
					}
				});
			}
		})();
		return sharedDataPromise;
	};

	const fetchCouncil = (council: CouncilId): Promise<void> => {
		const fetching =
			councilFetches.get(council) ??
			(async () => {
				setCouncilStatus(council, "loading");
				try {
					featuresByCouncil[council] = await fetchCouncilFeatures(council);
				} catch (error) {
					// The next call fetches it again.
					councilFetches.delete(council);
					setCouncilStatus(council, "error");
					throw error;
				}
			})();
		councilFetches.set(council, fetching);
		return fetching;
	};

	return {
		status: "idle",
		data: emptyData,
		activityById: {},
		treeCount: 0,
		ageHistogram: [],
		councilStatus: {},

		loadCouncils: async (ids) => {
			const missing = ids.filter((id) => !featuresByCouncil[id]);
			if (missing.length === 0 && get().status === "ready") {
				return;
			}
			if (get().status === "idle") {
				set({ status: "loading" });
			}
			// Settled from the start, so that a failure while the weather is
			// awaited is not an unhandled rejection.
			const fetches = Promise.allSettled(missing.map(fetchCouncil));
			await loadSharedData();
			const results = await fetches;

			// Draws the councils that arrived, also when another one failed.
			update(get().activityById);
			for (const id of missing) {
				if (featuresByCouncil[id]) {
					setCouncilStatus(id, "ready");
				}
			}
			set({ status: "ready" });

			const failure = results.find(
				(result): result is PromiseRejectedResult =>
					result.status === "rejected",
			);
			if (failure) {
				throw failure.reason;
			}
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
