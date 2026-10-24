import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
	CouncilId,
	councilIds,
	councils,
	mapAreaBbox,
} from "../../src/config/councils";
import { ageBandsOf } from "../../src/domain/tree-age";
import {
	buildAgeHistogram,
	enrichFeatures,
	TreeFeature,
} from "../../src/domain/tree-layer";

// Checks the committed data file against what the app expects of it.
const collection = JSON.parse(
	readFileSync("public/data/trees.geojson", "utf-8"),
) as { features: TreeFeature[] };
const features = collection.features;

const enrich = (now: string) =>
	enrichFeatures(features, {
		activityById: {},
		rain30dMm: 0,
		now: new Date(`${now}T12:00:00+08:00`),
	});

// Somewhat below the counts of the October 2026 import.
const MIN_TREES: Record<CouncilId, number> = {
	perth: 15_000,
	fremantle: 20_000,
	cockburn: 70_000,
	bassendean: 10_000,
};

describe("public/data/trees.geojson", () => {
	test("has every council's trees with unique ids", () => {
		for (const council of councilIds) {
			expect(
				features.filter((f) => f.properties.council === council).length,
			).toBeGreaterThan(MIN_TREES[council]);
		}
		expect(
			features.every((f) => councilIds.includes(f.properties.council)),
		).toBe(true);
		expect(new Set(features.map((f) => f.properties.id)).size).toBe(
			features.length,
		);
	});

	test("every tree is in its council's area, so the map can reach it", () => {
		const [minLng, minLat, maxLng, maxLat] = mapAreaBbox;
		const outside = features.filter(({ properties, geometry }) => {
			const [lng, lat] = geometry.coordinates;
			const [west, south, east, north] = councils[properties.council].bbox;
			return (
				lng < west ||
				lng > east ||
				lat < south ||
				lat > north ||
				lng < minLng ||
				lng > maxLng ||
				lat < minLat ||
				lat > maxLat
			);
		});
		expect(outside.map((f) => f.properties.id)).toEqual([]);
	});

	test("in season, young trees needing help are thirsty, the rest is green", () => {
		const enriched = enrich("2027-01-15");
		const thirsty = enriched.filter((f) => f.properties.need === "THIRSTY");

		expect(thirsty.length).toBeGreaterThan(500);
		for (const { properties } of thirsty) {
			// Too old for its council's watering, younger than "needs help" on 2027-01-15
			const { councilCareMaxYears, needsHelpMaxYears } = ageBandsOf(
				properties.council,
			);
			expect(
				properties.planted_date! > `${2027 - needsHelpMaxYears}-01-14`,
			).toBe(true);
			expect(
				properties.planted_date! <= `${2027 - councilCareMaxYears}-01-15`,
			).toBe(true);
		}
		// The City of Cockburn's data has no planting dates.
		expect(new Set(thirsty.map((f) => f.properties.council))).toEqual(
			new Set(["perth", "fremantle", "bassendean"]),
		);

		const green = enriched.filter(
			(f) => f.properties.need !== "THIRSTY" && f.properties.need !== "PARTIAL",
		);
		expect(green.length + thirsty.length).toBe(features.length);

		const before2019 = enriched.filter(
			(f) => f.properties.planted_date_precision === "before_2019",
		);
		expect(before2019.length).toBeGreaterThan(10_000);
		expect(before2019.every((f) => f.properties.need === "ESTABLISHED")).toBe(
			true,
		);
		expect(before2019.every((f) => f.properties.council === "perth")).toBe(
			true,
		);
	});

	test("before the season everything is green", () => {
		const enriched = enrich("2026-10-22");
		expect(enriched.every((f) => f.properties.need === "OFF_SEASON")).toBe(
			true,
		);
	});

	test("the age histogram covers every tree of known age", () => {
		const enriched = enrich("2027-01-15");
		const known = enriched.filter((f) => f.properties.age_bucket >= 0).length;
		const counts = buildAgeHistogram(enriched);
		expect(counts.reduce((a, b) => a + b, 0)).toBe(known);
		expect(counts[10]).toBeGreaterThan(10_000);
	});
});
