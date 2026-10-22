import React from "react";
import { getNow } from "../../domain/time";
import { useI18nStore } from "../../i18n/i18n-store";
import { TreeAgeIcon } from "../icons/tree-age-icon";
import { formatPlantingLine } from "./planting-line";
import { TreeCoreData } from "./tree-types";

interface TreeAgeProps {
	treeData: TreeCoreData;
}

export const TreeAge: React.FC<TreeAgeProps> = ({ treeData }) => {
	const i18n = useI18nStore().i18n();
	return (
		<div className="flex flex-col gap-2 border-b-2 py-8">
			<div className="flex flex-row items-center gap-1 text-xl font-bold">
				<TreeAgeIcon />
				<div>{i18n.treeDetail.ageTitle}</div>
			</div>
			<div data-testid="age">
				{formatPlantingLine(treeData, getNow(), i18n.treeDetail.planted)}
			</div>
		</div>
	);
};
