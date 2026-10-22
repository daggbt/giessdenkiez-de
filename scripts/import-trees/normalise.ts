import { city } from "../../src/config/city";
import { toCityDateString } from "../../src/domain/time";
import type { PlantedDatePrecision } from "../../src/domain/tree-age";

/** A feature as returned by the ArcGIS service with `f=geojson`. */
export interface RawFeature {
	geometry: { type: string; coordinates: number[] } | null;
	properties: Record<string, unknown>;
}

/** A row of the `trees` table (without `imported_at`). */
export interface TreeRecord {
	id: string;
	source_object_id: number | null;
	botanical_name: string | null;
	common_name: string | null;
	family: string | null;
	genus: string | null;
	planted_date: string | null;
	planted_date_precision: PlantedDatePrecision;
	suburb: string | null;
	height_m: number | null;
	is_rare: boolean;
	is_heritage: boolean;
	is_significant: boolean;
	is_significant_group: boolean;
	lat: number;
	lng: number;
}

export type SkipReason = "retired" | "invalid_geometry";

export interface NormaliseContext {
	usedIds: Set<string>;
	/** `YYYY-MM-DD` in the city time zone. */
	today: string;
	/** Distinct botanical names that did not yield a genus, with counts. */
	discardedGenusValues: Map<string, number>;
	duplicateIds: number;
}

export interface ImportReport {
	totalFetched: number;
	kept: number;
	skipped: Record<SkipReason, number>;
	duplicateIds: number;
	byPrecision: Record<PlantedDatePrecision, number>;
	bySuburb: Record<string, number>;
	topGenera: Array<{ genus: string; count: number }>;
	discardedGenusValues: Record<string, number>;
	bbox: [number, number, number, number] | null;
	center: { lng: number; lat: number } | null;
}

const LNG_RANGE = [115, 117] as const;
const LAT_RANGE = [-33, -31] as const;

// Botanical names that carry no genus.
const NOT_A_GENUS =
	/^(unknown|unidentified|vacant|none|n\/?a|tbc|tba|stump|dead|tree|nil)$/i;

export function createContext(today?: string): NormaliseContext {
	return {
		usedIds: new Set(),
		today: today ?? toCityDateString(new Date()),
		discardedGenusValues: new Map(),
		duplicateIds: 0,
	};
}

/** Trims; empty strings and non-strings become null. */
function cleanString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim().replace(/\s+/g, " ");
	return trimmed === "" ? null : trimmed;
}

function cleanNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const isYes = (value: unknown) =>
	typeof value === "string" && value.trim().toLowerCase() === "yes";

export function toTitleCase(value: string): string {
	return value
		.toLowerCase()
		.replace(
			/(^|[\s\-'])([a-z])/g,
			(_, separator, letter) => separator + letter.toUpperCase(),
		);
}

export function extractGenus(
	botanicalName: string | null,
	discarded?: Map<string, number>,
): string | null {
	if (botanicalName === null) {
		return null;
	}
	const tokens = botanicalName.split(" ").filter((t) => !/^[x×]$/i.test(t));
	const first = tokens[0] ?? "";
	if (
		!/^[A-Za-z][A-Za-z-]+$/.test(first) ||
		NOT_A_GENUS.test(botanicalName) ||
		NOT_A_GENUS.test(first)
	) {
		discarded?.set(botanicalName, (discarded.get(botanicalName) ?? 0) + 1);
		return null;
	}
	return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function normalisePlantedDate(
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
	const year = Number(date.slice(0, 4));
	if (year < 1901 || date > today) {
		return { planted_date: null, planted_date_precision: "unknown" };
	}
	if (date.endsWith("-01-01")) {
		return { planted_date: date, planted_date_precision: "year" };
	}
	return { planted_date: date, planted_date_precision: "day" };
}

function uniqueId(
	treeId: unknown,
	objectId: unknown,
	context: NormaliseContext,
): string {
	const base =
		typeof treeId === "number" ? String(treeId) : `obj-${String(objectId)}`;
	let id = base;
	if (context.usedIds.has(id)) {
		id = `${base}-${String(objectId)}`;
		context.duplicateIds += 1;
	}
	context.usedIds.add(id);
	return id;
}

export function normaliseFeature(
	feature: RawFeature,
	context: NormaliseContext,
): { record: TreeRecord } | { skipped: SkipReason } {
	const p = feature.properties;

	if (p.RETIRED !== null && p.RETIRED !== undefined) {
		return { skipped: "retired" };
	}

	const [lng, lat] =
		feature.geometry?.type === "Point" ? feature.geometry.coordinates : [];
	if (
		typeof lng !== "number" ||
		typeof lat !== "number" ||
		lng < LNG_RANGE[0] ||
		lng > LNG_RANGE[1] ||
		lat < LAT_RANGE[0] ||
		lat > LAT_RANGE[1]
	) {
		return { skipped: "invalid_geometry" };
	}

	const botanicalName = cleanString(p.BOTANICAL_NAME);
	const suburb = cleanString(p.SUBURB);

	return {
		record: {
			id: uniqueId(p.TREE_ID, p.OBJECTID, context),
			source_object_id: cleanNumber(p.OBJECTID),
			botanical_name: botanicalName,
			common_name: cleanString(p.COMMON_NAME),
			family: cleanString(p.FAMILY),
			genus: extractGenus(botanicalName, context.discardedGenusValues),
			...normalisePlantedDate(p.DATE_PLANTED, context.today),
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
}

const sortedCounts = (counts: Map<string, number>) =>
	Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]));

export function normaliseAll(
	features: RawFeature[],
	today?: string,
): { records: TreeRecord[]; report: ImportReport } {
	const context = createContext(today);
	const records: TreeRecord[] = [];
	const skipped: Record<SkipReason, number> = {
		retired: 0,
		invalid_geometry: 0,
	};

	for (const feature of features) {
		const result = normaliseFeature(feature, context);
		if ("skipped" in result) {
			skipped[result.skipped] += 1;
		} else {
			records.push(result.record);
		}
	}

	const byPrecision: Record<PlantedDatePrecision, number> = {
		day: 0,
		year: 0,
		before_2019: 0,
		unknown: 0,
	};
	const bySuburb = new Map<string, number>();
	const byGenus = new Map<string, number>();
	let minLng = Infinity,
		minLat = Infinity,
		maxLng = -Infinity,
		maxLat = -Infinity;

	for (const r of records) {
		byPrecision[r.planted_date_precision] += 1;
		const suburb = r.suburb ?? "(none)";
		bySuburb.set(suburb, (bySuburb.get(suburb) ?? 0) + 1);
		if (r.genus) {
			byGenus.set(r.genus, (byGenus.get(r.genus) ?? 0) + 1);
		}
		minLng = Math.min(minLng, r.lng);
		maxLng = Math.max(maxLng, r.lng);
		minLat = Math.min(minLat, r.lat);
		maxLat = Math.max(maxLat, r.lat);
	}

	const hasRecords = records.length > 0;
	return {
		records,
		report: {
			totalFetched: features.length,
			kept: records.length,
			skipped,
			duplicateIds: context.duplicateIds,
			byPrecision,
			bySuburb: sortedCounts(bySuburb),
			topGenera: [...byGenus]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 15)
				.map(([genus, count]) => ({ genus, count })),
			discardedGenusValues: sortedCounts(context.discardedGenusValues),
			bbox: hasRecords ? [minLng, minLat, maxLng, maxLat] : null,
			center: hasRecords
				? { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 }
				: null,
		},
	};
}
