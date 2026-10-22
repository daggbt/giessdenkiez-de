import { city } from "../config/city";
import { toCityDateString } from "./time";

export type AgeClass = "BABY" | "JUNIOR" | "SENIOR" | "UNKNOWN";

export type PlantedDatePrecision = "day" | "year" | "before_2019" | "unknown";

export interface TreePlantingInfo {
	planted_date: string | null;
	planted_date_precision: PlantedDatePrecision;
}

export interface TreeAge {
	ageYears: number | null;
	/** True when the real age is at least `ageYears` but may be much more. */
	isLowerBound: boolean;
}

const DAYS_PER_YEAR = 365.25;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dateStringToUtcMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

export function getTreeAge(tree: TreePlantingInfo, now: Date): TreeAge {
	return getTreeAgeOn(tree, toCityDateString(now));
}

/**
 * `getTreeAge` for a city-local date (`YYYY-MM-DD`). Classifying many trees is
 * much faster when the date is worked out once and passed to this.
 */
export function getTreeAgeOn(tree: TreePlantingInfo, today: string): TreeAge {
	const unknown = { ageYears: null, isLowerBound: false };

	const isBefore2019 = tree.planted_date_precision === "before_2019";
	const startDate = isBefore2019
		? city.inventoryCaptureDate
		: tree.planted_date;

	if (!startDate || tree.planted_date_precision === "unknown") {
		return unknown;
	}

	if (startDate > today) {
		return unknown;
	}

	const days =
		(dateStringToUtcMs(today) - dateStringToUtcMs(startDate)) / MS_PER_DAY;
	return { ageYears: days / DAYS_PER_YEAR, isLowerBound: isBefore2019 };
}

/** Age class from an age in years; band edges belong to the older class. */
export function classifyAgeYears(
	ageYears: number | null,
	isLowerBound = false,
): AgeClass {
	if (ageYears === null) {
		return "UNKNOWN";
	}
	const { councilCareMaxYears, needsHelpMaxYears } = city.ageBands;

	// A lower bound below the "needs help" limit says nothing about the real age.
	if (isLowerBound && ageYears < needsHelpMaxYears) {
		return "UNKNOWN";
	}
	if (ageYears < councilCareMaxYears) {
		return "BABY";
	}
	if (ageYears < needsHelpMaxYears) {
		return "JUNIOR";
	}
	return "SENIOR";
}

export function classifyTreeAge(tree: TreePlantingInfo, now: Date): AgeClass {
	const { ageYears, isLowerBound } = getTreeAge(tree, now);
	return classifyAgeYears(ageYears, isLowerBound);
}
