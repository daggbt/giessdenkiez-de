import { city } from "../config/city";
import { AgeClass } from "./tree-age";

const NUMBER_OF_DAYS_TO_LOOK_AT = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface Watering {
	amount: number;
	timestamp: string;
}

export interface WaterNeeds {
	rainSum: number;
	wateringSum: number;
	rainPercentage: number;
	wateringPercentage: number;
	otherWateringPercentage: number;
	referenceWaterAmount: number;
	stillMissingWater: number;
	shouldBeWatered: boolean;
}

export function computeWaterNeeds({
	ageClass,
	rain30dMm,
	waterings,
	now,
}: {
	ageClass: AgeClass;
	rain30dMm: number;
	waterings: Watering[];
	now: Date;
}): WaterNeeds {
	const referenceWaterAmount = city.targetLitresPer30Days[ageClass];

	// 1 mm of rain on 1 m² is 1 litre (upstream's implicit assumption).
	const rainSum = rain30dMm * city.rainCatchmentM2;

	const cutoff = now.getTime() - NUMBER_OF_DAYS_TO_LOOK_AT * MS_PER_DAY;
	const wateringSum = waterings
		.filter((w) => new Date(w.timestamp).getTime() > cutoff)
		.reduce((sum, w) => sum + w.amount, 0);

	// The ring is filled rain first, then waterings, then (for trees the City
	// waters or that are established) the remainder. Unlike upstream, every
	// share is clamped so that the three shares never add up to more than 1.
	const rainPercentage = Math.min(rainSum / referenceWaterAmount, 1);
	const wateringPercentage = Math.min(
		wateringSum / referenceWaterAmount,
		1 - rainPercentage,
	);
	const otherWateringPercentage =
		ageClass === "BABY" || ageClass === "SENIOR"
			? Math.max(0, 1 - rainPercentage - wateringPercentage)
			: 0;

	const stillMissingWater = Math.round(
		Math.max(0, referenceWaterAmount - rainSum - wateringSum),
	);

	const shouldBeWatered =
		ageClass === "BABY" || ageClass === "SENIOR"
			? false
			: wateringSum + rainSum < referenceWaterAmount;

	return {
		rainSum,
		wateringSum,
		rainPercentage,
		wateringPercentage,
		otherWateringPercentage,
		referenceWaterAmount,
		stillMissingWater,
		shouldBeWatered,
	};
}
