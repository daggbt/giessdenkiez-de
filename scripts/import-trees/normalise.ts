import { CouncilId, councils } from "../../src/config/councils";
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
	council: CouncilId;
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

export type SkipReason =
	| "removed"
	| "vacant"
	| "dead"
	| "planned"
	| "private_land"
	| "invalid_geometry";

const SKIP_REASONS: SkipReason[] = [
	"removed",
	"vacant",
	"dead",
	"planned",
	"private_land",
	"invalid_geometry",
];

export type NormaliseResult = { record: TreeRecord } | { skipped: SkipReason };

/** A council's tree layer, and how its features become rows. */
export interface TreeSource {
	council: CouncilId;
	/** An ArcGIS feature layer that is shared publicly. */
	layerUrl: string;
	/**
	 * Put before the council's own tree ids, so they cannot clash with another
	 * council's. Empty for the City of Perth, whose ids predate the others.
	 */
	idPrefix: string;
	normalise: (
		feature: RawFeature,
		context: NormaliseContext,
	) => NormaliseResult;
}

export interface NormaliseContext {
	idPrefix: string;
	usedIds: Set<string>;
	/** `YYYY-MM-DD` in the city time zone. */
	today: string;
	/** Distinct botanical names that did not yield a genus, with counts. */
	discardedGenusValues: Map<string, number>;
	duplicateIds: number;
}

export interface ImportReport {
	council: CouncilId;
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
	/** Trees outside the council's `bbox` in src/config/councils.ts; the map may not reach them. */
	outsideConfiguredBbox: number;
}

const LNG_RANGE = [115, 117] as const;
const LAT_RANGE = [-33, -31] as const;

// Botanical names that carry no genus.
const NOT_A_GENUS =
	/^(unknown|unidentified|unspecified|not specified|vacant|none|n\/?a|tbc|tba|stump|dead|tree|nil)$/i;

export function createContext(today?: string, idPrefix = ""): NormaliseContext {
	return {
		idPrefix,
		usedIds: new Set(),
		today: today ?? toCityDateString(new Date()),
		discardedGenusValues: new Map(),
		duplicateIds: 0,
	};
}

/** Trims; empty strings and non-strings become null. */
export function cleanString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim().replace(/\s+/g, " ");
	return trimmed === "" ? null : trimmed;
}

export function cleanNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** For measurements, where 0 means "not measured". */
export function positiveNumber(value: unknown): number | null {
	const number = cleanNumber(value);
	return number !== null && number > 0 ? number : null;
}

export const isYes = (value: unknown) =>
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

/** `[lng, lat]` of a point feature in the south-west of WA, or null. */
export function pointOf(feature: RawFeature): [number, number] | null {
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
		return null;
	}
	return [lng, lat];
}

/**
 * A planting date (`YYYY-MM-DD`) and how precise it is. Councils that only
 * know the year record a fixed day of it; `yearOnlyDays` lists those (`MM-DD`).
 */
export function plantedDate(
	date: string | null,
	today: string,
	yearOnlyDays: readonly string[] = ["01-01"],
): {
	planted_date: string | null;
	planted_date_precision: PlantedDatePrecision;
} {
	if (date === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return { planted_date: null, planted_date_precision: "unknown" };
	}
	const year = Number(date.slice(0, 4));
	if (year < 1901 || date > today) {
		return { planted_date: null, planted_date_precision: "unknown" };
	}
	if (yearOnlyDays.includes(date.slice(5))) {
		return { planted_date: date, planted_date_precision: "year" };
	}
	return { planted_date: date, planted_date_precision: "day" };
}

/**
 * The council's own id for the tree, or `obj-<OBJECTID>` without one; a
 * repeated id gets the OBJECTID appended.
 */
export function uniqueId(
	sourceId: string | null,
	objectId: unknown,
	context: NormaliseContext,
): string {
	const base = context.idPrefix + (sourceId ?? `obj-${String(objectId)}`);
	let id = base;
	if (context.usedIds.has(id)) {
		id = `${base}-${String(objectId)}`;
		context.duplicateIds += 1;
	}
	context.usedIds.add(id);
	return id;
}

/** The fields most councils do not record. */
export const NOT_RECORDED = {
	family: null,
	suburb: null,
	height_m: null,
	is_rare: false,
	is_heritage: false,
	is_significant: false,
	is_significant_group: false,
} as const satisfies Partial<TreeRecord>;

const sortedCounts = (counts: Map<string, number>) =>
	Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]));

export function normaliseAll(
	source: TreeSource,
	features: RawFeature[],
	today?: string,
): { records: TreeRecord[]; report: ImportReport } {
	const context = createContext(today, source.idPrefix);
	const records: TreeRecord[] = [];
	const skipped = Object.fromEntries(
		SKIP_REASONS.map((reason) => [reason, 0]),
	) as Record<SkipReason, number>;

	for (const feature of features) {
		const result = source.normalise(feature, context);
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
	const [west, south, east, north] = councils[source.council].bbox;
	let outsideConfiguredBbox = 0;

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
		if (r.lng < west || r.lng > east || r.lat < south || r.lat > north) {
			outsideConfiguredBbox += 1;
		}
	}

	const hasRecords = records.length > 0;
	return {
		records,
		report: {
			council: source.council,
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
			outsideConfiguredBbox,
		},
	};
}
