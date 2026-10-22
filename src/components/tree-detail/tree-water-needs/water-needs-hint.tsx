import React, { useState } from "react";
import { TertiaryButton } from "../../buttons/tertiary";
import { Markdown } from "../../markdown/markdown";
import { useI18nStore } from "../../../i18n/i18n-store";
import { useIsInWateringSeason } from "../../../utils/use-is-in-watering-season";
import { city } from "../../../config/city";
import { formatMonthRange, getSeasonMonths } from "../../../domain/season";

export const WaterNeedsHint: React.FC = () => {
	const i18n = useI18nStore().i18n();

	const isInWateringSeason = useIsInWateringSeason();

	const [isInfoboxVisible, setIsInfoboxVisible] = useState(false);

	const months = getSeasonMonths();
	const seasonMonths = formatMonthRange(months.season);
	const offSeasonMonths = formatMonthRange(months.offSeason);

	return (
		<div>
			<div className="grid grid-cols-1 grid-rows-1">
				<div className="relative col-start-1 row-start-1 flex flex-row items-center justify-between">
					<div className="pr-8">
						{isInWateringSeason
							? i18n.treeDetail.waterNeed.hint
							: i18n.treeDetail.waterNeed.hintOffSeason(offSeasonMonths)}{" "}
						{!isInfoboxVisible && (
							<button
								className="text-gdk-blue hover:text-gdk-light-blue font-semibold"
								onClick={() => setIsInfoboxVisible(true)}
							>
								{i18n.treeDetail.waterNeed.readMore}
							</button>
						)}
					</div>
				</div>
			</div>

			{isInfoboxVisible && (
				<div className={`flex flex-col gap-y-3 pt-2`}>
					{!isInWateringSeason && (
						<Markdown>
							{i18n.treeDetail.waterNeed.ageAndWaterHintOffSeason(
								seasonMonths,
								offSeasonMonths,
							)}
						</Markdown>
					)}
					<Markdown>
						{i18n.treeDetail.waterNeed.ageAndWaterHint(
							city.ageBands.councilCareMaxYears,
							city.ageBands.needsHelpMaxYears,
						)}
					</Markdown>
					<div className="flex w-full justify-center">
						<TertiaryButton
							onClick={() => setIsInfoboxVisible(false)}
							label={i18n.treeDetail.waterNeed.close}
						/>
					</div>
				</div>
			)}
		</div>
	);
};
