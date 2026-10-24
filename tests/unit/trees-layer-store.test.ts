import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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

/** Answers the trees file at once and Open-Meteo whenever the test says so. */
function stubFetch() {
	let answerWeather: (response: Response) => void = () => {};
	vi.stubGlobal(
		"fetch",
		vi.fn((input: RequestInfo | URL) =>
			String(input).includes("open-meteo")
				? new Promise<Response>((resolve) => {
						answerWeather = resolve;
					})
				: Promise.resolve(
						json({ type: "FeatureCollection", features: [junior] }),
					),
		),
	);
	return { answerWeather: (response: Response) => answerWeather(response) };
}

async function loadStore() {
	const { useTreesLayerStore } =
		await import("../../src/components/map/trees-layer-store");
	const need = () =>
		useTreesLayerStore.getState().data.features[0]?.properties.need;
	return { useTreesLayerStore, need };
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
		const { useTreesLayerStore, need } = await loadStore();

		const loading = useTreesLayerStore.getState().load();
		await vi.advanceTimersByTimeAsync(1000);
		await loading;

		expect(useTreesLayerStore.getState().status).toBe("ready");
		expect(need()).toBe("THIRSTY");

		// Enough rain to cover the tree's 30-day target.
		answerWeather(weather(500));
		await vi.waitFor(() => expect(need()).toBe("SATISFIED"));
	});

	test("uses rain data that arrives in time straight away", async () => {
		const { answerWeather } = stubFetch();
		const { useTreesLayerStore, need } = await loadStore();

		const loading = useTreesLayerStore.getState().load();
		answerWeather(weather(500));
		await loading;

		expect(need()).toBe("SATISFIED");
	});
});
