import { city } from "../../src/config/city";
import { toCityDateString } from "../../src/domain/time";
import type { PlantedDatePrecision } from "../../src/domain/tree-age";
import {
	cleanNumber,
	cleanString,
	extractGenus,
	isYes,
	NOT_RECORDED,
	plantedDate,
	pointOf,
	positiveNumber,
	toTitleCase,
	TreeSource,
	uniqueId,
} from "./normalise";

// Each council publishes its inventory as an ArcGIS feature layer. Only the
// City of Perth states a licence (CC BY); the others share theirs publicly
// without one (see README.md).

/** City of Perth: DATE_PLANTED is epoch ms; the 2019 bulk-capture day stands for "planted before". */
export function perthPlantedDate(
	epochMs: unknown,
	today: string,
): {
	planted_date: string | null;
	planted_date_precision: PlantedDatePrecision;
} {
	if (typeof epochMs !== "number" || !Number.isFinite(epochMs)) {
		return { planted_date: null, planted_date_precision: "unknown" };
	}
	const date = toCityDateString(new Date(epochMs));
	if (date === city.inventoryCaptureDate) {
		return { planted_date: null, planted_date_precision: "before_2019" };
	}
	return plantedDate(date, today);
}

/** An id that ArcGIS returns as a number. */
const numericId = (value: unknown) =>
	typeof value === "number" ? String(value) : null;

/** "Trees in the City", see docs/perth-prototype-roadmap.md (Appendix B). */
export const perth: TreeSource = {
	council: "perth",
	layerUrl:
		"https://services7.arcgis.com/v8XBa2naYNQGOjlG/arcgis/rest/services/PKS_AST_TREESMASTER_PV/FeatureServer/0",
	idPrefix: "",
	normalise(feature, context) {
		const p = feature.properties;
		if (p.RETIRED !== null && p.RETIRED !== undefined) {
			return { skipped: "removed" };
		}
		const point = pointOf(feature);
		if (!point) {
			return { skipped: "invalid_geometry" };
		}
		const [lng, lat] = point;
		const botanicalName = cleanString(p.BOTANICAL_NAME);
		const suburb = cleanString(p.SUBURB);

		return {
			record: {
				id: uniqueId(numericId(p.TREE_ID), p.OBJECTID, context),
				council: "perth",
				source_object_id: cleanNumber(p.OBJECTID),
				botanical_name: botanicalName,
				common_name: cleanString(p.COMMON_NAME),
				family: cleanString(p.FAMILY),
				genus: extractGenus(botanicalName, context.discardedGenusValues),
				...perthPlantedDate(p.DATE_PLANTED, context.today),
				suburb: suburb === null ? null : toTitleCase(suburb),
				height_m: cleanNumber(p.TREE_HEIGHT),
				is_rare: isYes(p.RARE_SPECIES),
				is_heritage: isYes(p.HISTORIC_SIGNIFICANCE),
				is_significant: isYes(p.COMMUNITY_SIGNIFICANCE),
				is_significant_group: isYes(p.SIGNIFICANT_GROUP),
				lat,
				lng,
			},
		};
	},
};

// Fremantle fills empty name fields with these; "#VALUE!" is a spreadsheet error.
const FREMANTLE_NO_VALUE = /^(-|not specified|#value!)$/i;
const fremantleValue = (value: unknown) => {
	const text = cleanString(value);
	return text === null || FREMANTLE_NO_VALUE.test(text) ? null : text;
};

/**
 * "Trees from Forestree", the City of Fremantle's master tree dataset. The
 * layer keeps removed trees and empty planting spots. About half of the trees
 * have no asset id. Dates are text; 1 July stands for "some time that year".
 */
export const fremantle: TreeSource = {
	council: "fremantle",
	layerUrl:
		"https://services3.arcgis.com/gxYehwfGQwBQvQkx/arcgis/rest/services/Trees/FeatureServer/0",
	idPrefix: "fremantle-",
	normalise(feature, context) {
		const p = feature.properties;
		if (p.status === "Vacant Tree Location") {
			return { skipped: "vacant" };
		}
		// "Removed" and "Stump"
		if (p.status !== "Tree") {
			return { skipped: "removed" };
		}
		if (p.health === "Dead") {
			return { skipped: "dead" };
		}
		const point = pointOf(feature);
		if (!point) {
			return { skipped: "invalid_geometry" };
		}
		const [lng, lat] = point;

		const genus = fremantleValue(p.genus);
		const species = fremantleValue(p.species);
		const variety = fremantleValue(p.variety)?.replace(/[‘’']/g, "") ?? null;
		const botanicalName =
			genus === null
				? null
				: [genus, species === "species" ? "sp." : species, variety]
						.filter((part) => part !== null)
						.join(" ");

		return {
			record: {
				...NOT_RECORDED,
				id: uniqueId(cleanString(p.asset_id), p.OBJECTID, context),
				council: "fremantle",
				source_object_id: cleanNumber(p.OBJECTID),
				botanical_name: botanicalName,
				common_name: fremantleValue(p.common_name),
				genus: extractGenus(botanicalName, context.discardedGenusValues),
				// "2022-07-01 00:00:00"
				...plantedDate(
					cleanString(p.planted_date)?.slice(0, 10) ?? null,
					context.today,
					["01-01", "07-01"],
				),
				height_m: positiveNumber(p.height_m),
				lat,
				lng,
			},
		};
	},
};

/** The City of Cockburn's street trees: no planting dates, only an age class. */
export const cockburn: TreeSource = {
	council: "cockburn",
	layerUrl:
		"https://services-ap1.arcgis.com/pvAgeoXPDsVDgOQ0/arcgis/rest/services/Street_Trees_3857_1de94/FeatureServer/0",
	idPrefix: "cockburn-",
	normalise(feature, context) {
		const p = feature.properties;
		const point = pointOf(feature);
		if (!point) {
			return { skipped: "invalid_geometry" };
		}
		const [lng, lat] = point;
		const botanicalName = cleanString(p.Botanical_Name);
		const suburb = cleanString(p.Suburb);

		return {
			record: {
				...NOT_RECORDED,
				id: uniqueId(numericId(p.Tree_Number), p.OBJECTID, context),
				council: "cockburn",
				source_object_id: cleanNumber(p.OBJECTID),
				botanical_name: botanicalName,
				// Common_Name holds 8-letter codes such as "OLIVETRE".
				common_name: cleanString(p.Full_Name_CommonName),
				family: cleanString(p.Family_Name),
				genus: extractGenus(botanicalName, context.discardedGenusValues),
				planted_date: null,
				planted_date_precision: "unknown",
				suburb: suburb === null ? null : toTitleCase(suburb),
				height_m: positiveNumber(p.Approx_Height_m),
				lat,
				lng,
			},
		};
	},
};

/**
 * The Town of Bassendean's trees, including planned, dead and removed ones.
 * 31 July stands for "planted that winter"; year_planted is 0 when unknown.
 */
export const bassendean: TreeSource = {
	council: "bassendean",
	layerUrl:
		"https://services-ap1.arcgis.com/551UnqKK1GZeDKxQ/arcgis/rest/services/Public_View_TOB_213_All_Trees_Corrected_July_2026_v1/FeatureServer/0",
	idPrefix: "bassendean-",
	normalise(feature, context) {
		const p = feature.properties;
		if (p.tree_status === "Planned") {
			return { skipped: "planned" };
		}
		if (p.tree_status === "Deceased") {
			return { skipped: "dead" };
		}
		if (p.tree_status !== "Exists") {
			return { skipped: "removed" };
		}
		if (p.tree_type === "Tree on Private Land") {
			return { skipped: "private_land" };
		}
		const point = pointOf(feature);
		if (!point) {
			return { skipped: "invalid_geometry" };
		}
		const [lng, lat] = point;
		const botanicalName = cleanString(p.botanical_name);
		const year = positiveNumber(p.year_planted);

		return {
			record: {
				...NOT_RECORDED,
				id: uniqueId(numericId(p.tree_number), p.OBJECTID, context),
				council: "bassendean",
				source_object_id: cleanNumber(p.OBJECTID),
				botanical_name: botanicalName,
				common_name: cleanString(p.common_name),
				genus: extractGenus(botanicalName, context.discardedGenusValues),
				...plantedDate(
					cleanString(p.date_planted) ?? (year ? `${year}-07-31` : null),
					context.today,
					["01-01", "07-31"],
				),
				height_m: positiveNumber(p.height_metre),
				lat,
				lng,
			},
		};
	},
};

/** In the order the trees are written to the outputs. */
export const sources: TreeSource[] = [perth, fremantle, cockburn, bassendean];
