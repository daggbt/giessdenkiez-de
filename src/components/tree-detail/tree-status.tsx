import React from "react";
import { useI18nStore } from "../../i18n/i18n-store";
import { useWeatherStore } from "../../weather/weather-store";
import { useIsInWateringSeason } from "../../utils/use-is-in-watering-season";
import { computeWaterNeeds } from "../../domain/water-needs";
import {
	getNeedStatus,
	NEED_STATUS_COLOR_TOKEN,
	NeedStatus,
} from "../../domain/tree-status";
import { formatMonthRange, getSeasonMonths } from "../../domain/season";
import { Markdown } from "../markdown/markdown";
import { TreeAgeClassification, TreeWateringData } from "./tree-types";
import { Council } from "../../config/councils";

// Written out in full so Tailwind generates the classes.
const CHIP_CLASS: Record<(typeof NEED_STATUS_COLOR_TOKEN)[NeedStatus], string> =
	{
		"gdk-neon-green": "bg-gdk-neon-green",
		"gdk-tree-yellow": "bg-gdk-tree-yellow",
		"gdk-tree-orange": "bg-gdk-tree-orange",
	};

interface TreeStatusProps {
	treeAgeClassification: TreeAgeClassification;
	treeWateringData: TreeWateringData[];
	/** The council that looks after the tree. */
	council: Council;
}

/**
 * What the tree needs right now, in the colour it has on the map. Uses the
 * same rules as the map (`getNeedStatus`), from the panel's own waterings.
 */
export const TreeStatus: React.FC<TreeStatusProps> = ({
	treeAgeClassification,
	treeWateringData,
	council,
}) => {
	const i18n = useI18nStore().i18n();
	const { formatNumber } = useI18nStore();
	const rain30dMm = useWeatherStore((store) => store.rain30dMm);
	const isInWateringSeason = useIsInWateringSeason();

	const { wateringSum, stillMissingWater } = computeWaterNeeds({
		ageClass: treeAgeClassification,
		rain30dMm,
		waterings: treeWateringData,
		// Waterings are matched against the real clock, like on the map.
		now: new Date(),
	});
	const need = getNeedStatus({
		inSeason: isInWateringSeason,
		ageClass: treeAgeClassification,
		rain30dMm,
		watered30dL: wateringSum,
	});

	const status = i18n.treeDetail.status;
	const litres = formatNumber(stillMissingWater, true);
	const text: Record<NeedStatus, string> = {
		THIRSTY: status.thirsty(litres),
		PARTIAL: status.partial(litres),
		SATISFIED: status.satisfied,
		COUNCIL_CARE: status.councilCare(council.name),
		ESTABLISHED: status.established,
		UNKNOWN_AGE: status.unknownAge,
		OFF_SEASON: status.offSeason(formatMonthRange(getSeasonMonths().season)),
	};

	return (
		<div
			className="flex flex-row items-start gap-3 rounded-lg border-2 p-4"
			data-testid="tree-status"
		>
			<span
				className={`mt-1 h-4 w-4 shrink-0 rounded-full ${CHIP_CLASS[NEED_STATUS_COLOR_TOKEN[need]]}`}
			/>
			<Markdown>{text[need]}</Markdown>
		</div>
	);
};
