import { Expression } from "mapbox-gl";
import { useMapConstants } from "./use-map-constants.js";
import resolveConfig from "tailwindcss/resolveConfig";
import { MAX_AGE_BUCKET } from "../../../domain/tree-layer";
import { NEED_STATUS_COLOR_TOKEN } from "../../../domain/tree-status";

//@ts-expect-error tailwindConfig has no type definition
import tailwindConfig from "../../../../tailwind.config.js";
import { TreeAgeRange } from "../../filter/filter-store";
const fullConfig = resolveConfig(tailwindConfig);

export function useTreeCircleStyle() {
	const {
		TREE_DEFAULT_COLOR,
		TREE_GRAY_COLOR,
		TREE_ORANGE_COLOR,
		TREE_YELLOW_COLOR,
	} = useMapConstants();

	const circleRadius: {
		base: number;
		stops: [[number, number], [number, number]];
	} = {
		base: 1.75,
		stops: [
			[11, 1],
			[22, 100],
		],
	};

	const circleOpacity = [
		"interpolate",
		["linear"],
		["zoom"],
		10,
		0.7,
		20,
		0.5,
	] as Expression;

	const circleStrokeColor = [
		"case",
		["boolean", ["feature-state", "hover"], false],
		fullConfig.theme.colors["gdk-blue"],
		["boolean", ["feature-state", "select"], false],
		fullConfig.theme.colors["gdk-blue"],
		"#000000",
	] as Expression;

	const circleStrokeWidth = [
		"interpolate",
		["exponential", 2],
		["zoom"],
		16,
		[
			"case",
			["boolean", ["feature-state", "hover"], false],
			2,
			["boolean", ["feature-state", "select"], false],
			2,
			0,
		],
		18,
		[
			"case",
			["boolean", ["feature-state", "hover"], false],
			6,
			["boolean", ["feature-state", "select"], false],
			6,
			0,
		],
		20,
		[
			"case",
			["boolean", ["feature-state", "hover"], false],
			10,
			["boolean", ["feature-state", "select"], false],
			10,
			0,
		],
	] as Expression;

	/**
	 * The colour only depends on the precomputed `need` property (see
	 * src/domain/tree-status.ts), so season, age bands and targets live in one place.
	 */
	const tokenColors = {
		"gdk-neon-green": TREE_DEFAULT_COLOR,
		"gdk-tree-yellow": TREE_YELLOW_COLOR,
		"gdk-tree-orange": TREE_ORANGE_COLOR,
	};
	const needColor: Expression = [
		"match",
		["get", "need"],
		...Object.entries(NEED_STATUS_COLOR_TOKEN)
			.filter(([, token]) => token !== "gdk-neon-green")
			.flatMap(([status, token]) => [status, tokenColors[token]]),
		TREE_DEFAULT_COLOR,
	];

	const filteredCircleColor = ({
		areOnlyAllAdoptedTreesVisible,
		areLastWateredTreesVisible,
		treeAgeRange,
	}: {
		areOnlyAllAdoptedTreesVisible: boolean;
		areLastWateredTreesVisible: boolean;
		treeAgeRange: TreeAgeRange;
	}): Expression => {
		// Trees matching any of these are greyed out.
		const hidden: Expression[] = [];

		const isAgeFilterActive =
			treeAgeRange.min > 0 || treeAgeRange.max < MAX_AGE_BUCKET;
		if (isAgeFilterActive) {
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

		if (hidden.length === 0) {
			return needColor;
		}

		return ["case", ["any", ...hidden], TREE_GRAY_COLOR, needColor];
	};

	return {
		circleRadius,
		circleOpacity,
		circleStrokeColor,
		circleStrokeWidth,
		filteredCircleColor,
	};
}
