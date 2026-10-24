import { CouncilId } from "../../config/councils";
import { AgeClass, PlantedDatePrecision } from "../../domain/tree-age";

// Same values as the upstream enum; the definition lives in the domain module.
export const TreeAgeClassification = {
	BABY: "BABY",
	JUNIOR: "JUNIOR",
	SENIOR: "SENIOR",
	UNKNOWN: "UNKNOWN",
} as const satisfies Record<AgeClass, AgeClass>;
export type TreeAgeClassification = AgeClass;

/** Mirrors a row of the `trees` table. */
export interface TreeCoreData {
	id: string;
	council: CouncilId;
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

export interface TreeWateringData {
	amount: number;
	id: number;
	timestamp: string;
	tree_id: string;
	username: string | null;
}

export interface AccumulatedTreeWateringData {
	[key: string]: number; // key is the tree id, value is the watering amount
}

export interface TreeWateringDataState {
	rainSum: number;
	wateringSum: number;
	rainPercentage: number;
	wateringPercentage: number;
	otherWateringPercentage: number;
	referenceWaterAmount: number;
	stillMissingWater: number;
	waterParts: ProgressPart[];
	shouldBeWatered: boolean;
	userWateringColor: string;
	otherWateringColor: string;
	rainColor: string;
}

export interface ProgressPart {
	color: string;
	progress: number;
}

export interface PartialCircleProps {
	parts: ProgressPart[];
	title: string;
	size: number;
}

export interface WaterCircleProps {
	parts: ProgressPart[];
	needsWaterAmount: number;
	shouldBeWatered: boolean;
	treeAgeClassification: TreeAgeClassification;
	/** The council that looks after the tree. */
	councilName: string;
	size: number;
	rainSum: number;
	wateringSum: number;
}

export interface TreeAgeClassificationState {
	treeAgeClassification: TreeAgeClassification;
}
