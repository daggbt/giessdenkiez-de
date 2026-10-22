import { getTreeAge, classifyAgeYears } from "../../../domain/tree-age";
import { getNow } from "../../../domain/time";
import { TreeAgeClassificationState, TreeCoreData } from "../tree-types";

export function useTreeAgeClassification(
	treeData?: TreeCoreData,
	referenceDate: Date = getNow(),
): TreeAgeClassificationState {
	if (!treeData) {
		return { treeAgeClassification: "UNKNOWN" };
	}

	const { ageYears, isLowerBound } = getTreeAge(treeData, referenceDate);

	return { treeAgeClassification: classifyAgeYears(ageYears, isLowerBound) };
}
