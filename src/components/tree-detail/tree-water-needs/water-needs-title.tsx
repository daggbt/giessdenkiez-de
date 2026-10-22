import React from "react";
import { useI18nStore } from "../../../i18n/i18n-store";
import { Markdown } from "../../markdown/markdown";
import { TreeAgeClassification } from "../tree-types";
import { useIsInWateringSeason } from "../../../utils/use-is-in-watering-season";

interface WaterNeedsTitleProps {
	treeAgeClassification: TreeAgeClassification;
	referenceWaterAmount: number;
}

export const WaterNeedsTitle: React.FC<WaterNeedsTitleProps> = ({
	treeAgeClassification,
	referenceWaterAmount,
}) => {
	const i18n = useI18nStore().i18n();
	const { formatNumber } = useI18nStore();

	const isInWateringSeason = useIsInWateringSeason();

	return (
		<div>
			{!isInWateringSeason && (
				<div className="text-xl font-bold ">
					{i18n.treeDetail.waterNeed.winterSleep}
				</div>
			)}

			{isInWateringSeason &&
				(treeAgeClassification === TreeAgeClassification.BABY ||
					treeAgeClassification === TreeAgeClassification.SENIOR) && (
					<div className="text-xl font-bold">
						{i18n.treeDetail.waterNeed.waterManaged}
					</div>
				)}

			{isInWateringSeason &&
				treeAgeClassification === TreeAgeClassification.JUNIOR && (
					<Markdown className="text-xl font-bold ">
						{i18n.treeDetail.waterNeed.needXLiters(
							formatNumber(referenceWaterAmount, true),
						)}
					</Markdown>
				)}
		</div>
	);
};
