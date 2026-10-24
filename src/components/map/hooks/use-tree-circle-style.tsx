import { Expression } from "mapbox-gl";
import { useMapConstants } from "./use-map-constants.js";
import resolveConfig from "tailwindcss/resolveConfig";
import { NEED_STATUS_COLOR_TOKEN } from "../../../domain/tree-status";

//@ts-expect-error tailwindConfig has no type definition
import tailwindConfig from "../../../../tailwind.config.js";
import { filteredOut, TreeFilters } from "../tree-filters";
const fullConfig = resolveConfig(tailwindConfig);

/** The statuses that are not green: what volunteers look for on the map. */
const STATUSES_NEEDING_HELP = Object.entries(NEED_STATUS_COLOR_TOKEN)
	.filter(([, token]) => token !== "gdk-neon-green")
	.map(([status]) => status);

export function useTreeCircleStyle() {
	const {
		TREE_DEFAULT_COLOR,
		TREE_GRAY_COLOR,
		TREE_ORANGE_COLOR,
		TREE_YELLOW_COLOR,
	} = useMapConstants();

	const isHoveredOrSelected: Expression = [
		"any",
		["boolean", ["feature-state", "hover"], false],
		["boolean", ["feature-state", "select"], false],
	];

	// A white outline keeps neighbouring dots apart on a light base map.
	const circleStrokeColor = [
		"case",
		isHoveredOrSelected,
		fullConfig.theme.colors["gdk-blue"],
		"#FFFFFF",
	] as Expression;

	const circleStrokeWidth = [
		"interpolate",
		["linear"],
		["zoom"],
		12,
		["case", isHoveredOrSelected, 2, 0.5],
		16,
		["case", isHoveredOrSelected, 3, 1],
		20,
		["case", isHoveredOrSelected, 6, 1.5],
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

	/** Thirsty or partly watered, and not greyed out by a filter. */
	const needsHelp = (filters: TreeFilters): Expression => {
		const needsWater: Expression = [
			"in",
			["get", "need"],
			["literal", STATUSES_NEEDING_HELP],
		];
		const hidden = filteredOut(filters);
		return hidden ? ["all", needsWater, ["!", hidden]] : needsWater;
	};

	const filteredCircleColor = (filters: TreeFilters): Expression => {
		const hidden = filteredOut(filters);
		return hidden ? ["case", hidden, TREE_GRAY_COLOR, needColor] : needColor;
	};

	/** Trees that need help are drawn larger, opaque and on top of the others. */
	const circleRadius = (filters: TreeFilters): Expression => {
		const isProminent = needsHelp(filters);
		const radius = (pixels: number): Expression => [
			"case",
			isProminent,
			pixels * 1.4,
			pixels,
		];
		return [
			"interpolate",
			["linear"],
			["zoom"],
			12,
			radius(1.5),
			14,
			radius(3),
			16,
			radius(6),
			18,
			radius(12),
			20,
			radius(24),
		];
	};

	const circleOpacity = (filters: TreeFilters): Expression => [
		"case",
		needsHelp(filters),
		1,
		0.85,
	];

	const circleSortKey = (filters: TreeFilters): Expression => [
		"case",
		needsHelp(filters),
		1,
		0,
	];

	return {
		circleRadius,
		circleOpacity,
		circleSortKey,
		circleStrokeColor,
		circleStrokeWidth,
		filteredCircleColor,
	};
}
