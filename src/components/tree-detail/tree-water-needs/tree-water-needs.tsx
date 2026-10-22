import React, { useState } from "react";
import { useI18nStore } from "../../../i18n/i18n-store";
import { ChevronDown } from "../../icons/chevron-down";
import { ChevronRight } from "../../icons/chevron-right";
import { useTreeWaterNeedsData } from "../hooks/use-tree-water-needs-data";
import {
	TreeAgeClassification,
	TreeCoreData,
	TreeWateringData,
} from "../tree-types";
import { WaterProgressCircle } from "./water-progress-circle/water-progress-circle";
import { WateringCanIcon } from "../../icons/watering-can-icon";
import { WaterNeedsHint } from "./water-needs-hint";
import { WaterNeedsTitle } from "./water-needs-title";
import { WaterTree } from "./water-tree/water-tree";
import { WaterProgressCircleWinter } from "./water-progress-circle/water-progress-circle-winter";
import { useWeatherStore } from "../../../weather/weather-store";
import { useIsInWateringSeason } from "../../../utils/use-is-in-watering-season";

interface TreeWaterNeedProps {
	treeData: TreeCoreData;
	treeAgeClassification: TreeAgeClassification;
	treeWateringData: TreeWateringData[];
}

export const TreeWaterNeed: React.FC<TreeWaterNeedProps> = ({
	treeData,
	treeAgeClassification,
	treeWateringData,
}) => {
	const i18n = useI18nStore().i18n();

	const isInWateringSeason = useIsInWateringSeason();

	const weatherStatus = useWeatherStore((store) => store.status);
	const rain30dMm = useWeatherStore((store) => store.rain30dMm);

	const [isExpanded, setIsExpanded] = useState(true);

	const {
		rainSum,
		wateringSum,
		referenceWaterAmount,
		stillMissingWater,
		waterParts,
		shouldBeWatered,
	} = useTreeWaterNeedsData(treeWateringData, treeAgeClassification, rain30dMm);

	return (
		<div className="flex flex-col gap-4 border-b-2 py-8">
			<button
				className="flex flex-row items-center justify-between  text-xl font-bold"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex flex-row items-center gap-1">
					<WateringCanIcon />
					<div className="">{i18n.treeDetail.waterNeed.title}</div>
				</div>
				<div className="text-gdk-blue">
					{isExpanded ? <ChevronDown /> : <ChevronRight />}
				</div>
			</button>
			{isExpanded && (
				<div className="flex flex-col gap-4">
					<WaterNeedsHint />

					<WaterNeedsTitle
						treeAgeClassification={treeAgeClassification}
						referenceWaterAmount={referenceWaterAmount}
					/>

					{isInWateringSeason && (
						<WaterProgressCircle
							parts={waterParts}
							needsWaterAmount={stillMissingWater}
							shouldBeWatered={shouldBeWatered}
							treeAgeClassification={treeAgeClassification}
							size={200}
							rainSum={rainSum}
							wateringSum={wateringSum}
						/>
					)}

					{!isInWateringSeason && <WaterProgressCircleWinter />}

					{isInWateringSeason && (
						<div className="font-bold">
							{i18n.treeDetail.waterNeed.dataOfLastXDays}
						</div>
					)}

					{isInWateringSeason && weatherStatus === "error" && (
						<div className="text-sm text-slate-500">
							{i18n.treeDetail.waterNeed.weatherUnavailable}
						</div>
					)}

					<WaterTree
						treeData={treeData}
						treeAgeClassification={treeAgeClassification}
					/>
				</div>
			)}
		</div>
	);
};
