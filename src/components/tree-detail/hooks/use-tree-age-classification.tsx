import { getTreeAge, classifyAgeYears } from "../../../domain/tree-age";
import { getNow } from "../../../domain/time";
import { TreeAgeClassificationState, TreeCoreData } from "../tree-types";

export function useTreeAgeClassification(
	treeData?: TreeCoreData,
	referenceDate: Date = getNow(),
): TreeAgeClassificationState {
	if (!treeData) {
		return { treeAgeClassification: "UNKNOWN", treeAge: undefined };
	}

	const { ageYears, isLowerBound } = getTreeAge(treeData, referenceDate);

	return {
		treeAgeClassification: classifyAgeYears(ageYears, isLowerBound),
		// A lower bound ("before 2019") is not a real age.
		treeAge:
			ageYears === null || isLowerBound ? undefined : Math.floor(ageYears),
	};
}
