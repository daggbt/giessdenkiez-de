import React from "react";
import { useI18nStore } from "../../i18n/i18n-store";
import { TreeCoreData } from "./tree-types";

interface TreeFactsProps {
	treeData: TreeCoreData;
}

export const TreeFacts: React.FC<TreeFactsProps> = ({ treeData }) => {
	const i18n = useI18nStore().i18n();
	const { formatNumber } = useI18nStore();
	const facts = i18n.treeDetail.facts;

	const rows: Array<[string, string]> = [];
	if (treeData.suburb) {
		rows.push([facts.suburb, treeData.suburb]);
	}
	if (treeData.height_m !== null) {
		rows.push([
			facts.height,
			facts.heightValue(formatNumber(treeData.height_m)),
		]);
	}

	const badges = [
		treeData.is_significant && facts.significant,
		treeData.is_heritage && facts.heritage,
		treeData.is_significant_group && facts.significantGroup,
		treeData.is_rare && facts.rare,
	].filter((badge): badge is string => typeof badge === "string");

	if (rows.length === 0 && badges.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3 border-b-2 py-6">
			{rows.map(([label, value]) => (
				<div key={label} className="flex flex-row justify-between">
					<div className="text-slate-500">{label}</div>
					<div className="font-semibold">{value}</div>
				</div>
			))}
			{badges.length > 0 && (
				<div className="flex flex-row flex-wrap gap-2">
					{badges.map((badge) => (
						<span
							key={badge}
							className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600"
						>
							{badge}
						</span>
					))}
				</div>
			)}
		</div>
	);
};
