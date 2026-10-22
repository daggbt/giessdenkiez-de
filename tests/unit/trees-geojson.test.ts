import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
	buildAgeHistogram,
	enrichFeatures,
	TreeFeature,
} from "../../src/domain/tree-layer";

// Checks the committed data file against the roadmap's expectations for M4.
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

describe("public/data/trees.geojson", () => {
	test("has the City of Perth trees with unique ids", () => {
		expect(features.length).toBeGreaterThan(15_000);
		expect(new Set(features.map((f) => f.properties.id)).size).toBe(
			features.length,
		);
	});

	test("in season, young trees needing help are thirsty, the rest is green", () => {
		const enriched = enrich("2027-01-15");
		const thirsty = enriched.filter((f) => f.properties.need === "THIRSTY");

		expect(thirsty.length).toBeGreaterThan(500);
		for (const { properties } of thirsty) {
			// 2 to 5 years old on 2027-01-15
			expect(properties.planted_date! >= "2022-01-16").toBe(true);
			expect(properties.planted_date! <= "2025-01-15").toBe(true);
		}

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
