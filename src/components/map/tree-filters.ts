import type { Expression } from "mapbox-gl";
import {
	EnrichedTreeProperties,
	MAX_AGE_BUCKET,
} from "../../domain/tree-layer";
import {
	NEED_STATUS_COLOR_TOKEN,
	NeedColor,
	statusesWithColor,
} from "../../domain/tree-status";
import type { TreeAgeRange } from "../filter/filter-store";

export interface TreeFilters {
	areOnlyAllAdoptedTreesVisible: boolean;
	areLastWateredTreesVisible: boolean;
	treeAgeRange: TreeAgeRange;
	/** A colour picked in the legend: trees of the other colours are greyed out. */
	colorFilter: NeedColor | undefined;
}

const isAgeFilterActive = ({ min, max }: TreeAgeRange) =>
	min > 0 || max < MAX_AGE_BUCKET;

/**
 * Matches the trees the active filters grey out; undefined without filters.
 * `isFilteredOut` must give the same answers.
 */
export function filteredOut({
	areOnlyAllAdoptedTreesVisible,
	areLastWateredTreesVisible,
	treeAgeRange,
	colorFilter,
}: TreeFilters): Expression | undefined {
	const hidden: Expression[] = [];

	if (isAgeFilterActive(treeAgeRange)) {
		// -1 is a tree of unknown age
		hidden.push(["==", ["get", "age_bucket"], -1]);
		if (treeAgeRange.min > 0) {
			hidden.push(["<", ["get", "age_bucket"], treeAgeRange.min]);
		}
		// the oldest bucket means "this age and older"
		if (treeAgeRange.max < MAX_AGE_BUCKET) {
			hidden.push([">", ["get", "age_bucket"], treeAgeRange.max]);
		}
	}

	if (areOnlyAllAdoptedTreesVisible) {
		hidden.push(["!", ["get", "adopted"]]);
	}

	if (areLastWateredTreesVisible) {
		hidden.push(["<=", ["get", "watered_30d_l"], 0]);
	}

	if (colorFilter) {
		hidden.push([
			"!",
			["in", ["get", "need"], ["literal", statusesWithColor(colorFilter)]],
		]);
	}

	return hidden.length === 0 ? undefined : ["any", ...hidden];
}

/** `filteredOut` for one tree, for work outside the map such as framing trees. */
export function isFilteredOut(
	tree: EnrichedTreeProperties,
	{
		areOnlyAllAdoptedTreesVisible,
		areLastWateredTreesVisible,
		treeAgeRange,
		colorFilter,
	}: TreeFilters,
): boolean {
	const isOutsideAgeRange =
		tree.age_bucket === -1 ||
		tree.age_bucket < treeAgeRange.min ||
		tree.age_bucket > treeAgeRange.max;

	return (
		(isAgeFilterActive(treeAgeRange) && isOutsideAgeRange) ||
		(areOnlyAllAdoptedTreesVisible && !tree.adopted) ||
		(areLastWateredTreesVisible && tree.watered_30d_l <= 0) ||
		(colorFilter !== undefined &&
			NEED_STATUS_COLOR_TOKEN[tree.need] !== colorFilter)
	);
}
