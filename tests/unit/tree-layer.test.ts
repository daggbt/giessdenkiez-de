import { describe, expect, test, vi } from "vitest";
import {
	buildAgeHistogram,
	enrichFeatures,
	TreeFeature,
} from "../../src/domain/tree-layer";
import { buildWeatherUrl, parseWeather } from "../../src/weather/weather-store";

const inSeason = new Date("2027-01-15T12:00:00+08:00");
const offSeason = new Date("2026-10-22T12:00:00+08:00");

const tree = (
	id: string,
	planted_date: string | null,
	planted_date_precision: TreeFeature["properties"]["planted_date_precision"],
): TreeFeature => ({
	type: "Feature",
	geometry: { type: "Point", coordinates: [115.86, -31.95] },
	properties: {
		id,
		genus: "Platanus",
		common_name: "London Plane",
		planted_date,
		planted_date_precision,
	},
});

const trees = [
	tree("young", "2026-07-01", "day"), // BABY
	tree("junior", "2023-07-01", "day"), // JUNIOR
	tree("old", null, "before_2019"), // SENIOR, lower bound
	tree("unknown", null, "unknown"),
];

describe("enrichFeatures", () => {
	test("adds age, class, activity and need in season", () => {
		const [young, junior, old, unknown] = enrichFeatures(trees, {
			activityById: {},
			rain30dMm: 0,
			now: inSeason,
		}).map((f) => f.properties);

		expect(young).toMatchObject({ age_class: "BABY", need: "COUNCIL_CARE" });
		expect(junior).toMatchObject({
			age_class: "JUNIOR",
			need: "THIRSTY",
			adopted: false,
			watered_30d_l: 0,
		});
		expect(junior.age_years).toBeCloseTo(3.5, 1);
		expect(junior.age_bucket).toBe(3);
		expect(old).toMatchObject({
			age_class: "SENIOR",
			need: "ESTABLISHED",
			age_bucket: 10,
		});
		expect(unknown).toMatchObject({
			age_years: -1,
			age_bucket: -1,
			age_class: "UNKNOWN",
			need: "UNKNOWN_AGE",
		});
	});

	test("uses activity: partial, satisfied and adopted", () => {
		const activity = {
			junior: {
				watered_litres_30d: 50,
				watering_count_30d: 1,
				adopted_count: 2,
			},
		};
		const partial = enrichFeatures(trees, {
			activityById: activity,
			rain30dMm: 0,
			now: inSeason,
		})[1].properties;
		expect(partial).toMatchObject({
			need: "PARTIAL",
			watered_30d_l: 50,
			adopted: true,
		});

		const satisfied = enrichFeatures(trees, {
			activityById: { junior: { ...activity.junior, watered_litres_30d: 400 } },
			rain30dMm: 0,
			now: inSeason,
		})[1].properties;
		expect(satisfied.need).toBe("SATISFIED");

		const rained = enrichFeatures(trees, {
			activityById: {},
			rain30dMm: 400,
			now: inSeason,
		})[1].properties;
		expect(rained.need).toBe("SATISFIED");
	});

	test("everything is OFF_SEASON outside the season", () => {
		const needs = enrichFeatures(trees, {
			activityById: {},
			rain30dMm: 0,
			now: offSeason,
		}).map((f) => f.properties.need);
		expect(needs).toEqual([
			"OFF_SEASON",
			"OFF_SEASON",
			"OFF_SEASON",
			"OFF_SEASON",
		]);
	});

	test("does not mutate the input features", () => {
		enrichFeatures(trees, { activityById: {}, rain30dMm: 0, now: inSeason });
		expect(trees[0].properties).not.toHaveProperty("need");
	});

	// Building a formatter per tree once froze the page for seconds.
	test("does not build a date formatter per tree", () => {
		const many = Array.from({ length: 100 }, (_, i) =>
			tree(`tree-${i}`, "2023-07-01", "day"),
		);
		const DateTimeFormat = vi.spyOn(Intl, "DateTimeFormat");
		try {
			enrichFeatures(many, { activityById: {}, rain30dMm: 0, now: inSeason });
			expect(DateTimeFormat.mock.calls.length).toBeLessThan(3);
		} finally {
			DateTimeFormat.mockRestore();
		}
	});
});

describe("buildAgeHistogram", () => {
	test("counts trees per age bucket and ignores unknown ages", () => {
		const counts = buildAgeHistogram(
			enrichFeatures(trees, { activityById: {}, rain30dMm: 0, now: inSeason }),
		);
		expect(counts).toHaveLength(11);
		expect(counts[0]).toBe(1);
		expect(counts[3]).toBe(1);
		expect(counts[10]).toBe(1);
		expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
	});
});

describe("weather", () => {
	test("builds the Open-Meteo URL for the Perth CBD", () => {
		const url = new URL(buildWeatherUrl());
		expect(url.searchParams.get("latitude")).toBe("-31.9523");
		expect(url.searchParams.get("longitude")).toBe("115.8613");
		expect(url.searchParams.get("past_days")).toBe("30");
		expect(url.searchParams.get("timezone")).toBe("Australia/Perth");
	});

	test("sums precipitation and treats nulls as 0", () => {
		const { rain30dMm, daily } = parseWeather({
			daily: {
				time: ["2027-01-13", "2027-01-14", "2027-01-15"],
				precipitation_sum: [1.5, null, 2],
				et0_fao_evapotranspiration: [6, 7, null],
				temperature_2m_max: [38, null, 41],
			},
		});
		expect(rain30dMm).toBe(3.5);
		expect(daily.precipitationMm).toEqual([1.5, 0, 2]);
		expect(daily.et0Mm).toEqual([6, 7, 0]);
		expect(daily.temperatureMaxC).toEqual([38, null, 41]);
	});
});
