import { describe, expect, test } from "vitest";
import {
	createContext,
	extractGenus,
	normaliseAll,
	normaliseFeature,
	RawFeature,
	toTitleCase,
	TreeRecord,
} from "../../scripts/import-trees/normalise";
import { buildSeedSql, sqlLiteral } from "../../scripts/import-trees/outputs";

const TODAY = "2026-10-22";

// Sample rows from the roadmap (Appendix B), converted from the `f=json` shape
// to the `f=geojson` shape the importer reads.
const feature = (
	attributes: Record<string, unknown>,
	geometry: { x: number; y: number } = { x: 115.86, y: -31.95 },
): RawFeature => ({
	geometry: { type: "Point", coordinates: [geometry.x, geometry.y] },
	properties: attributes,
});

const base = {
	OBJECTID: 1,
	TREE_ID: 1918,
	DATE_PLANTED: 1186531200000,
	SUBURB: "PERTH",
	BOTANICAL_NAME: "Quercus palustris",
	COMMON_NAME: "Pin Oak",
	FAMILY: "Fagaceae",
	TREE_HEIGHT: 1.5,
	RARE_SPECIES: "No",
	HISTORIC_SIGNIFICANCE: "No",
	COMMUNITY_SIGNIFICANCE: "No",
	SIGNIFICANT_GROUP: "No",
	RETIRED: null,
};

const normalise = (
	attributes: Record<string, unknown>,
	context = createContext(TODAY),
) => {
	const result = normaliseFeature(feature({ ...base, ...attributes }), context);
	if ("skipped" in result) {
		throw new Error(`skipped: ${result.skipped}`);
	}
	return result.record;
};

// Epoch ms of 12:00 Perth time on the given date
const perthNoon = (date: string) =>
	new Date(`${date}T12:00:00+08:00`).getTime();

describe("normaliseFeature", () => {
	test("the first sample row: a normal date", () => {
		const record = normalise({});
		expect(record).toMatchObject({
			id: "1918",
			source_object_id: 1,
			planted_date: "2007-08-08",
			planted_date_precision: "day",
			suburb: "Perth",
			genus: "Quercus",
			common_name: "Pin Oak",
			family: "Fagaceae",
			height_m: 1.5,
			is_rare: false,
			lng: 115.86,
			lat: -31.95,
		});
	});

	test("the 2019-05-10 capture date becomes before_2019 without a date", () => {
		const record = normalise({
			TREE_ID: 1920,
			DATE_PLANTED: 1557458487000,
			SUBURB: "Perth",
			BOTANICAL_NAME: "Cinnamomum camphora",
			TREE_HEIGHT: null,
		});
		expect(record.planted_date).toBeNull();
		expect(record.planted_date_precision).toBe("before_2019");
		expect(record.height_m).toBeNull();
	});

	test("a null date is unknown", () => {
		const record = normalise({ DATE_PLANTED: null });
		expect(record.planted_date).toBeNull();
		expect(record.planted_date_precision).toBe("unknown");
	});

	test("placeholder years are unknown", () => {
		for (const date of ["1900-01-01", "1800-06-01", "1753-01-01"]) {
			const record = normalise({ DATE_PLANTED: perthNoon(date) });
			expect(record.planted_date).toBeNull();
			expect(record.planted_date_precision).toBe("unknown");
		}
	});

	test("dates in the future are unknown", () => {
		const record = normalise({ DATE_PLANTED: perthNoon("2026-10-23") });
		expect(record.planted_date_precision).toBe("unknown");
	});

	test("today is a valid planting date", () => {
		const record = normalise({ DATE_PLANTED: perthNoon("2026-10-22") });
		expect(record.planted_date).toBe("2026-10-22");
		expect(record.planted_date_precision).toBe("day");
	});

	test("January 1st is year precision", () => {
		const record = normalise({ DATE_PLANTED: perthNoon("2008-01-01") });
		expect(record.planted_date).toBe("2008-01-01");
		expect(record.planted_date_precision).toBe("year");
	});

	test("dates are taken in Perth time, not UTC", () => {
		// 2009-01-01 00:30 in Perth is still 2008-12-31 in UTC
		const record = normalise({
			DATE_PLANTED: new Date("2009-01-01T00:30:00+08:00").getTime(),
		});
		expect(record.planted_date).toBe("2009-01-01");
		expect(record.planted_date_precision).toBe("year");
	});

	test("suburbs are trimmed and title-cased; empty becomes null", () => {
		expect(normalise({ SUBURB: "EAST PERTH " }).suburb).toBe("East Perth");
		expect(normalise({ SUBURB: "Perth" }).suburb).toBe("Perth");
		expect(normalise({ SUBURB: "  " }).suburb).toBeNull();
	});

	test("a null TREE_ID falls back to obj-<OBJECTID>", () => {
		expect(normalise({ TREE_ID: null, OBJECTID: 77 }).id).toBe("obj-77");
	});

	test("a duplicate TREE_ID gets the OBJECTID appended", () => {
		const context = createContext(TODAY);
		const first = normalise({ TREE_ID: 5, OBJECTID: 10 }, context);
		const second = normalise({ TREE_ID: 5, OBJECTID: 11 }, context);
		expect(first.id).toBe("5");
		expect(second.id).toBe("5-11");
		expect(context.duplicateIds).toBe(1);
	});

	test("flags are true only for 'Yes'", () => {
		const record = normalise({
			RARE_SPECIES: "Yes",
			HISTORIC_SIGNIFICANCE: "Yes",
			COMMUNITY_SIGNIFICANCE: "No",
			SIGNIFICANT_GROUP: null,
		});
		expect(record).toMatchObject({
			is_rare: true,
			is_heritage: true,
			is_significant: false,
			is_significant_group: false,
		});
	});

	test("retired trees and invalid geometry are skipped", () => {
		const context = createContext(TODAY);
		expect(
			normaliseFeature(feature({ ...base, RETIRED: 1700000000000 }), context),
		).toEqual({ skipped: "retired" });
		expect(normaliseFeature(feature(base, { x: 0, y: 0 }), context)).toEqual({
			skipped: "invalid_geometry",
		});
		expect(
			normaliseFeature({ geometry: null, properties: base }, context),
		).toEqual({ skipped: "invalid_geometry" });
	});
});

describe("extractGenus", () => {
	test("takes the first token, capitalised", () => {
		expect(extractGenus("Platanus x acerifolia")).toBe("Platanus");
		expect(extractGenus("EUCALYPTUS rudis")).toBe("Eucalyptus");
		expect(extractGenus("x Cupressocyparis leylandii")).toBe("Cupressocyparis");
	});

	test("discards placeholder values and records them", () => {
		const discarded = new Map<string, number>();
		expect(extractGenus("Unknown species", discarded)).toBeNull();
		expect(extractGenus("Unknown", discarded)).toBeNull();
		expect(extractGenus("vacant", discarded)).toBeNull();
		expect(extractGenus(null, discarded)).toBeNull();
		expect(discarded.get("Unknown species")).toBe(1);
		expect(discarded.get("Unknown")).toBe(1);
	});
});

describe("toTitleCase", () => {
	test("capitalises words and hyphenated parts", () => {
		expect(toTitleCase("EAST PERTH")).toBe("East Perth");
		expect(toTitleCase("north-bridge")).toBe("North-Bridge");
	});
});

describe("normaliseAll", () => {
	test("builds a report", () => {
		const { records, report } = normaliseAll(
			[
				feature({ ...base, OBJECTID: 1, TREE_ID: 1 }),
				feature({ ...base, OBJECTID: 2, TREE_ID: 1, DATE_PLANTED: null }),
				feature({ ...base, OBJECTID: 3, TREE_ID: 3, RETIRED: 1 }),
			],
			TODAY,
		);
		expect(records.map((r) => r.id)).toEqual(["1", "1-2"]);
		expect(report).toMatchObject({
			totalFetched: 3,
			kept: 2,
			skipped: { retired: 1, invalid_geometry: 0 },
			duplicateIds: 1,
			byPrecision: { day: 1, unknown: 1, year: 0, before_2019: 0 },
			topGenera: [{ genus: "Quercus", count: 2 }],
			bbox: [115.86, -31.95, 115.86, -31.95],
		});
	});
});

describe("seed SQL", () => {
	test("escapes literals", () => {
		expect(sqlLiteral("O'Connor")).toBe("'O''Connor'");
		expect(sqlLiteral(null)).toBe("null");
		expect(sqlLiteral(true)).toBe("true");
		expect(sqlLiteral(1.5)).toBe("1.5");
	});

	test("generates an upsert", () => {
		const record: TreeRecord = normalise({ COMMON_NAME: "Bull's Tree" });
		const sql = buildSeedSql([record]);
		expect(sql).toContain("insert into public.trees");
		expect(sql).toContain("'Bull''s Tree'");
		expect(sql).toContain("on conflict (id) do update set");
	});
});
