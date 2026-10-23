import type { Feature, FeatureCollection, Point } from "geojson";
import { isInWateringSeason } from "./season";
import { toCityDateString } from "./time";
import {
	classifyAgeYears,
	getTreeAgeOn,
	PlantedDatePrecision,
} from "./tree-age";
import type { AgeClass } from "./tree-age";
import { getNeedStatus, NeedStatus } from "./tree-status";

/** Properties of a feature in public/data/trees.geojson. */
export interface TreeProperties {
	id: string;
	genus: string | null;
	common_name: string | null;
	planted_date: string | null;
	planted_date_precision: PlantedDatePrecision;
}

/** A tree's entry in the `tree_activity_30d` RPC. */
export interface TreeActivity {
	watered_litres_30d: number;
	watering_count_30d: number;
	adopted_count: number;
}

export type ActivityById = Record<string, TreeActivity>;

/** The oldest age bucket (10) also contains trees "planted before 2019". */
export const MAX_AGE_BUCKET = 10;

export interface EnrichedTreeProperties extends TreeProperties {
	/** Age in years; -1 when unknown (Mapbox expressions dislike null). */
	age_years: number;
	/** 0 to 10 for filtering and the histogram; 10 means "10 and older / before 2019"; -1 when unknown. */
	age_bucket: number;
	age_class: AgeClass;
	adopted: boolean;
	watered_30d_l: number;
	need: NeedStatus;
}

export type TreeFeature = Feature<Point, TreeProperties>;
export type EnrichedTreeFeature = Feature<Point, EnrichedTreeProperties>;

export interface EnrichmentContext {
	activityById: ActivityById;
	rain30dMm: number;
	now: Date;
}

export function enrichFeatures(
	features: TreeFeature[],
	{ activityById, rain30dMm, now }: EnrichmentContext,
): EnrichedTreeFeature[] {
	const inSeason = isInWateringSeason(now);
	// Once for all trees: formatting the date is the slow part of an age.
	const today = toCityDateString(now);

	return features.map((feature) => {
		const properties = feature.properties;
		const activity = activityById[properties.id];
		const watered30dL = activity?.watered_litres_30d ?? 0;

		const { ageYears, isLowerBound } = getTreeAgeOn(properties, today);
		const ageClass = classifyAgeYears(ageYears, isLowerBound);

		let ageBucket = -1;
		if (ageYears !== null) {
			ageBucket = isLowerBound
				? MAX_AGE_BUCKET
				: Math.min(Math.floor(ageYears), MAX_AGE_BUCKET);
		}

		return {
			...feature,
			properties: {
				...properties,
				age_years: ageYears ?? -1,
				age_bucket: ageBucket,
				age_class: ageClass,
				adopted: (activity?.adopted_count ?? 0) > 0,
				watered_30d_l: watered30dL,
				need: getNeedStatus({
					inSeason,
					ageClass,
					rain30dMm,
					watered30dL,
				}),
			},
		};
	});
}

export function toFeatureCollection(
	features: EnrichedTreeFeature[],
): FeatureCollection<Point, EnrichedTreeProperties> {
	return { type: "FeatureCollection", features };
}

/** Number of trees per age bucket (index 0 to 10); trees of unknown age are left out. */
export function buildAgeHistogram(features: EnrichedTreeFeature[]): number[] {
	const counts = new Array<number>(MAX_AGE_BUCKET + 1).fill(0);
	for (const { properties } of features) {
		if (properties.age_bucket >= 0) {
			counts[properties.age_bucket] += 1;
		}
	}
	return counts;
}
