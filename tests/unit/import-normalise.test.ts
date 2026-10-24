import { describe, expect, test } from "vitest";
import {
	createContext,
	extractGenus,
	normaliseAll,
	plantedDate,
	RawFeature,
	toTitleCase,
	TreeRecord,
	TreeSource,
} from "../../scripts/import-trees/normalise";
import { buildSeedSql, sqlLiteral } from "../../scripts/import-trees/outputs";
import {
	bassendean,
	cockburn,
	fremantle,
	perth,
	sources,
} from "../../scripts/import-trees/sources";

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

/** The record of a feature that is kept; fails the test if it is skipped. */
const record = (
	source: TreeSource,
	attributes: Record<string, unknown>,
	geometry?: { x: number; y: number },
	context = createContext(TODAY, source.idPrefix),
): TreeRecord => {
	const result = source.normalise(feature(attributes, geometry), context);
	if ("skipped" in result) {
		throw new Error(`skipped: ${result.skipped}`);
	}
	return result.record;
};

const normalise = (
	attributes: Record<string, unknown>,
	context = createContext(TODAY),
) => record(perth, { ...base, ...attributes }, undefined, context);

const skipReason = (source: TreeSource, attributes: Record<string, unknown>) =>
	source.normalise(feature(attributes), createContext(TODAY, source.idPrefix));

// Epoch ms of 12:00 Perth time on the given date
const perthNoon = (date: string) =>
	new Date(`${date}T12:00:00+08:00`).getTime();

describe("City of Perth", () => {
	test("the first sample row: a normal date", () => {
		const record = normalise({});
		expect(record).toMatchObject({
			id: "1918",
			council: "perth",
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
			perth.normalise(feature({ ...base, RETIRED: 1700000000000 }), context),
		).toEqual({ skipped: "removed" });
		expect(perth.normalise(feature(base, { x: 0, y: 0 }), context)).toEqual({
			skipped: "invalid_geometry",
		});
		expect(
			perth.normalise({ geometry: null, properties: base }, context),
		).toEqual({ skipped: "invalid_geometry" });
	});
});

// Rows from the councils' layers, cut down to the fields the importer reads.
const fremantleTree = {
	OBJECTID: 1,
	asset_id: "plantings_270",
	status: "Tree",
	health: "Good",
	genus: "Angophora",
	species: "costata",
	variety: null,
	common_name: "Sydney Red Gum",
	planted_date: "2022-07-01 00:00:00",
	height_m: 4,
};

describe("City of Fremantle", () => {
	test("a row with an asset id; 1 July stands for the year", () => {
		expect(record(fremantle, fremantleTree)).toEqual({
			id: "fremantle-plantings_270",
			council: "fremantle",
			source_object_id: 1,
			botanical_name: "Angophora costata",
			common_name: "Sydney Red Gum",
			family: null,
			genus: "Angophora",
			planted_date: "2022-07-01",
			planted_date_precision: "year",
			suburb: null,
			height_m: 4,
			is_rare: false,
			is_heritage: false,
			is_significant: false,
			is_significant_group: false,
			lat: -31.95,
			lng: 115.86,
		});
	});

	test("other days are precise; no asset id falls back to the OBJECTID", () => {
		expect(
			record(fremantle, {
				...fremantleTree,
				OBJECTID: 423,
				asset_id: null,
				planted_date: "2023-07-17 00:00:00",
			}),
		).toMatchObject({
			id: "fremantle-obj-423",
			planted_date: "2023-07-17",
			planted_date_precision: "day",
		});
	});

	test("names: placeholders, 'species' and varieties", () => {
		expect(
			record(fremantle, {
				...fremantleTree,
				genus: "Not specified",
				species: null,
				common_name: "Not specified",
			}),
		).toMatchObject({ botanical_name: null, genus: null, common_name: null });
		expect(
			record(fremantle, {
				...fremantleTree,
				genus: "Araucaria",
				species: "species",
				common_name: "-",
			}),
		).toMatchObject({
			botanical_name: "Araucaria sp.",
			genus: "Araucaria",
			common_name: null,
		});
		expect(
			record(fremantle, {
				...fremantleTree,
				genus: "Corymbia",
				species: "eximia",
				variety: "nana",
			}).botanical_name,
		).toBe("Corymbia eximia nana");
		expect(
			record(fremantle, { ...fremantleTree, genus: "#VALUE!" }).genus,
		).toBeNull();
	});

	test("a height of 0 is not measured", () => {
		expect(record(fremantle, { ...fremantleTree, height_m: 0 }).height_m).toBe(
			null,
		);
	});

	test("removed trees, stumps, empty spots and dead trees are skipped", () => {
		expect(
			skipReason(fremantle, { ...fremantleTree, status: "Removed" }),
		).toEqual({ skipped: "removed" });
		expect(
			skipReason(fremantle, { ...fremantleTree, status: "Stump" }),
		).toEqual({
			skipped: "removed",
		});
		expect(
			skipReason(fremantle, {
				...fremantleTree,
				status: "Vacant Tree Location",
			}),
		).toEqual({ skipped: "vacant" });
		expect(skipReason(fremantle, { ...fremantleTree, health: "Dead" })).toEqual(
			{
				skipped: "dead",
			},
		);
	});
});

describe("City of Cockburn", () => {
	test("a street tree: full common name, title-cased suburb, no date", () => {
		expect(
			record(cockburn, {
				OBJECTID: 1661,
				Tree_Number: 1725,
				Suburb: "HAMILTON HILL",
				Botanical_Name: "Fraxinus raywoodii",
				Common_Name: "CLARTASH",
				Full_Name_CommonName: "Claret Ash",
				Family_Name: "Oleaceae ",
				Approx_Height_m: 2,
				Tree_Age: "YOUNG",
			}),
		).toMatchObject({
			id: "cockburn-1725",
			council: "cockburn",
			source_object_id: 1661,
			botanical_name: "Fraxinus raywoodii",
			common_name: "Claret Ash",
			family: "Oleaceae",
			genus: "Fraxinus",
			planted_date: null,
			planted_date_precision: "unknown",
			suburb: "Hamilton Hill",
			height_m: 2,
		});
	});
});

const bassendeanTree = {
	OBJECTID: 1180,
	tree_number: 1180,
	tree_status: "Exists",
	tree_type: "Street Tree",
	botanical_name: "Corymbia ficifolia",
	common_name: "Red Flowering Gum",
	date_planted: "2024-05-30",
	year_planted: 2024,
	height_metre: 3,
};

describe("Town of Bassendean", () => {
	test("a planted day; 31 July stands for the year", () => {
		expect(record(bassendean, bassendeanTree)).toMatchObject({
			id: "bassendean-1180",
			council: "bassendean",
			botanical_name: "Corymbia ficifolia",
			common_name: "Red Flowering Gum",
			genus: "Corymbia",
			planted_date: "2024-05-30",
			planted_date_precision: "day",
			height_m: 3,
		});
		expect(
			record(bassendean, { ...bassendeanTree, date_planted: "2023-07-31" }),
		).toMatchObject({
			planted_date: "2023-07-31",
			planted_date_precision: "year",
		});
	});

	test("a year without a day; year 0 is unknown", () => {
		expect(
			record(bassendean, { ...bassendeanTree, date_planted: null }),
		).toMatchObject({
			planted_date: "2024-07-31",
			planted_date_precision: "year",
		});
		expect(
			record(bassendean, {
				...bassendeanTree,
				date_planted: null,
				year_planted: 0,
			}),
		).toMatchObject({ planted_date: null, planted_date_precision: "unknown" });
	});

	test("planned, dead, removed and private trees are skipped", () => {
		for (const [attributes, reason] of [
			[{ tree_status: "Planned" }, "planned"],
			[{ tree_status: "Deceased" }, "dead"],
			[{ tree_status: "Removed" }, "removed"],
			[{ tree_type: "Tree on Private Land" }, "private_land"],
		] as const) {
			expect(
				skipReason(bassendean, { ...bassendeanTree, ...attributes }),
			).toEqual({ skipped: reason });
		}
	});
});

describe("tree ids", () => {
	test("each council but the City of Perth prefixes its own ids", () => {
		expect(sources.map((source) => source.idPrefix)).toEqual([
			"",
			"fremantle-",
			"cockburn-",
			"bassendean-",
		]);
	});
});

describe("plantedDate", () => {
	test("checks the shape, the year and the future", () => {
		expect(plantedDate("2020-03-04", TODAY)).toEqual({
			planted_date: "2020-03-04",
			planted_date_precision: "day",
		});
		for (const date of [null, "2020-3-4", "1900-06-01", "2026-10-23"]) {
			expect(plantedDate(date, TODAY).planted_date_precision).toBe("unknown");
		}
	});

	test("a council's year-only days are year precision", () => {
		expect(plantedDate("2020-07-01", TODAY).planted_date_precision).toBe("day");
		expect(
			plantedDate("2020-07-01", TODAY, ["01-01", "07-01"])
				.planted_date_precision,
		).toBe("year");
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
		expect(extractGenus("Not specified", discarded)).toBeNull();
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
			perth,
			[
				feature({ ...base, OBJECTID: 1, TREE_ID: 1 }),
				feature({ ...base, OBJECTID: 2, TREE_ID: 1, DATE_PLANTED: null }),
				feature({ ...base, OBJECTID: 3, TREE_ID: 3, RETIRED: 1 }),
			],
			TODAY,
		);
		expect(records.map((r) => r.id)).toEqual(["1", "1-2"]);
		expect(report).toMatchObject({
			council: "perth",
			totalFetched: 3,
			kept: 2,
			skipped: { removed: 1, invalid_geometry: 0 },
			duplicateIds: 1,
			byPrecision: { day: 1, unknown: 1, year: 0, before_2019: 0 },
			topGenera: [{ genus: "Quercus", count: 2 }],
			bbox: [115.86, -31.95, 115.86, -31.95],
			outsideConfiguredBbox: 0,
		});
	});

	test("counts trees outside the council's configured area", () => {
		const { report } = normaliseAll(
			perth,
			[feature(base), feature({ ...base, OBJECTID: 2 }, { x: 116, y: -32 })],
			TODAY,
		);
		expect(report.outsideConfiguredBbox).toBe(1);
	});
});

describe("seed SQL", () => {
	test("escapes literals", () => {
		expect(sqlLiteral("O'Connor")).toBe("'O''Connor'");
		expect(sqlLiteral(null)).toBe("null");
		expect(sqlLiteral(true)).toBe("true");
		expect(sqlLiteral(1.5)).toBe("1.5");
	});

	test("generates an upsert that sets the council", () => {
		const record: TreeRecord = normalise({ COMMON_NAME: "Bull's Tree" });
		const sql = buildSeedSql([record]);
		expect(sql).toContain("insert into public.trees (id, council,");
		expect(sql).toContain("('1918', 'perth',");
		expect(sql).toContain("'Bull''s Tree'");
		expect(sql).toContain("on conflict (id) do update set");
		expect(sql).toContain("council = excluded.council");
	});
});
