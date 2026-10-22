import { computeWaterNeeds } from "../../../domain/water-needs";
import {
	TreeAgeClassification,
	TreeWateringData,
	TreeWateringDataState,
} from "../tree-types.js";

import resolveConfig from "tailwindcss/resolveConfig";
//@ts-expect-error tailwindConfig has no type definition
import tailwindConfig from "../../../../tailwind.config.js";
const fullConfig = resolveConfig(tailwindConfig);

export function useTreeWaterNeedsData(
	treeWateringData: TreeWateringData[],
	treeAgeClassification: TreeAgeClassification,
	rain30dMm: number,
): TreeWateringDataState {
	// OTHER_WATERING_COLOR is the color for watering by groundwater and the City
	const GROUNDWATER_WATERING_COLOR =
		fullConfig.theme.colors["gdk-groundwater-blue"];
	const DISTRICT_WATERING_COLOR =
		fullConfig.theme.colors["gdk-distric-watering-green"];
	const OTHER_WATERING_COLOR =
		treeAgeClassification === "BABY"
			? DISTRICT_WATERING_COLOR
			: GROUNDWATER_WATERING_COLOR;
	const USER_WATERING_COLOR = fullConfig.theme.colors["gdk-watering-blue"];
	const RAIN_COLOR = fullConfig.theme.colors["gdk-rain-blue"];

	const needs = computeWaterNeeds({
		ageClass: treeAgeClassification,
		rain30dMm,
		waterings: treeWateringData,
		// Waterings are matched against the real clock (as is the database), not
		// the `?now=` development override.
		now: new Date(),
	});

	return {
		rainSum: needs.rainSum,
		wateringSum: needs.wateringSum,
		rainPercentage: needs.rainPercentage,
		wateringPercentage: needs.wateringPercentage,
		otherWateringPercentage: needs.otherWateringPercentage,
		referenceWaterAmount: needs.referenceWaterAmount,
		stillMissingWater: needs.stillMissingWater,
		waterParts: [
			{ color: RAIN_COLOR, progress: needs.rainPercentage },
			{ color: USER_WATERING_COLOR, progress: needs.wateringPercentage },
			{ color: OTHER_WATERING_COLOR, progress: needs.otherWateringPercentage },
		],
		shouldBeWatered: needs.shouldBeWatered,
		userWateringColor: USER_WATERING_COLOR,
		otherWateringColor: GROUNDWATER_WATERING_COLOR,
		rainColor: RAIN_COLOR,
	};
}
