import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CouncilId } from "../../src/config/councils";
import type { TreeFeature } from "../../src/domain/tree-layer";

vi.mock("../../src/auth/supabase-client", () => ({
	supabaseClient: {
		rpc: vi.fn(async () => ({ data: {}, error: null })),
	},
}));

// Planted 3.5 years before the (faked) date: needs help in season.
const junior: TreeFeature = {
	type: "Feature",
	geometry: { type: "Point", coordinates: [115.86, -31.95] },
	properties: {
		id: "junior",
		council: "perth",
		genus: "Platanus",
		common_name: "London Plane",
		planted_date: "2023-07-01",
		planted_date_precision: "day",
	},
};

const fremantleTree: TreeFeature = {
	...junior,
	geometry: { type: "Point", coordinates: [115.77, -32.06] },
	properties: {
		...junior.properties,
		id: "fremantle-TRE00001",
		council: "fremantle",
	},
};

const json = (body: unknown) =>
	new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json" },
	});

const weather = (rainMm: number) =>
	json({
		daily: {
			time: ["2027-01-15"],
			precipitation_sum: [rainMm],
			et0_fao_evapotranspiration: [5],
			temperature_2m_max: [30],
		},
	});

/**
 * Answers each council's trees file at once, with its trees or an HTTP error
 * status, and Open-Meteo whenever the test says so.
 */
function stubFetch(
	treesByCouncil: Partial<Record<CouncilId, TreeFeature[] | number>> = {
		perth: [junior],
	},
) {
	let answerWeather: (response: Response) => void = () => {};
	const fetch = vi.fn((input: RequestInfo | URL) => {
		const url = String(input);
		if (url.includes("open-meteo")) {
			return new Promise<Response>((resolve) => {
				answerWeather = resolve;
			});
		}
		const council = /\/(\w+)\.geojson$/.exec(url)?.[1] as CouncilId;
		const trees = treesByCouncil[council] ?? [];
		return Promise.resolve(
			typeof trees === "number"
				? new Response("", { status: trees })
				: json({ type: "FeatureCollection", features: trees }),
		);
	});
	vi.stubGlobal("fetch", fetch);
	return {
		answerWeather: (response: Response) => answerWeather(response),
		fetchesOf: (council: CouncilId) =>
			fetch.mock.calls.filter(([input]) =>
				String(input).endsWith(`/${council}.geojson`),
			).length,
	};
}

async function loadStore() {
	const { useTreesLayerStore } =
		await import("../../src/components/map/trees-layer-store");
	const need = () =>
		useTreesLayerStore.getState().data.features[0]?.properties.need;
	const ids = () =>
		useTreesLayerStore.getState().data.features.map((f) => f.properties.id);
	/** Loads councils while the weather does not answer (the store waits 1 s for it). */
	const loadCouncils = async (councils: CouncilId[]) => {
		const loading = useTreesLayerStore.getState().loadCouncils(councils);
		// Caught here, so that a rejection is not unhandled while time passes.
		const settled = loading.then(
			() => undefined,
			(error: unknown) => error,
		);
		await vi.advanceTimersByTimeAsync(1000);
		return settled;
	};
	return { useTreesLayerStore, need, ids, loadCouncils };
}

describe("trees layer store", () => {
	beforeEach(() => {
		// The store keeps its loaded data at module level.
		vi.resetModules();
		vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
		vi.setSystemTime(new Date("2027-01-15T12:00:00+08:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	test("draws the trees without waiting for slow rain data, then re-colours them", async () => {
		const { answerWeather } = stubFetch();
		const { useTreesLayerStore, need, loadCouncils } = await loadStore();

		await loadCouncils(["perth"]);

		expect(useTreesLayerStore.getState().status).toBe("ready");
		expect(need()).toBe("THIRSTY");

		// Enough rain to cover the tree's 30-day target.
		answerWeather(weather(500));
		await vi.waitFor(() => expect(need()).toBe("SATISFIED"));
	});

	test("uses rain data that arrives in time straight away", async () => {
		const { answerWeather } = stubFetch();
		const { useTreesLayerStore, need } = await loadStore();

		const loading = useTreesLayerStore.getState().loadCouncils(["perth"]);
		answerWeather(weather(500));
		await loading;

		expect(need()).toBe("SATISFIED");
	});

	test("adds a council's trees to those loaded before, fetching each council once", async () => {
		const { fetchesOf } = stubFetch({
			perth: [junior],
			fremantle: [fremantleTree],
		});
		const { useTreesLayerStore, ids, loadCouncils } = await loadStore();

		await loadCouncils(["perth"]);
		expect(ids()).toEqual(["junior"]);

		await Promise.all([
			useTreesLayerStore.getState().loadCouncils(["fremantle"]),
			useTreesLayerStore.getState().loadCouncils(["perth", "fremantle"]),
		]);
		expect(ids()).toEqual(["junior", "fremantle-TRE00001"]);
		expect(useTreesLayerStore.getState().councilStatus).toEqual({
			perth: "ready",
			fremantle: "ready",
		});
		expect(fetchesOf("perth")).toBe(1);
		expect(fetchesOf("fremantle")).toBe(1);
	});

	test("draws the councils that arrived when another fails, and tries that one again when asked", async () => {
		const { fetchesOf } = stubFetch({ perth: [junior], cockburn: 503 });
		const { useTreesLayerStore, ids, loadCouncils } = await loadStore();

		const error = await loadCouncils(["perth", "cockburn"]);

		expect(String(error)).toContain("cockburn");
		expect(ids()).toEqual(["junior"]);
		expect(useTreesLayerStore.getState().councilStatus).toEqual({
			perth: "ready",
			cockburn: "error",
		});

		await expect(
			useTreesLayerStore.getState().loadCouncils(["cockburn"]),
		).rejects.toThrow("HTTP 503");
		expect(fetchesOf("cockburn")).toBe(2);
	});
});
