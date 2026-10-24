import * as mapboxgl from "mapbox-gl";
import { EnrichedTreeFeature } from "../../domain/tree-layer";
import { NEED_STATUS_COLOR_TOKEN, NeedColor } from "../../domain/tree-status";
import { useFilterStore } from "../filter/filter-store";
import { useMapConstants } from "../map/hooks/use-map-constants";
import { useMapStore } from "../map/map-store";
import { isFilteredOut } from "../map/tree-filters";
import { useTreesLayerStore } from "../map/trees-layer-store";
import { useTreeStore } from "../tree-detail/stores/tree-store";

/** Why a colour picked in the legend has no trees to show. */
export type NoTreesReason = "offSeason" | "filters" | "none";

// Room for the search bar at the top of the map.
const SEARCH_BAR_SPACE = 90;
const MARGIN = 40;
// On large screens the tree panel covers the right of the map (see tree-detail.tsx).
const LARGE_SCREEN_MIN_WIDTH = 1024;
const TREE_PANEL_WIDTH = 400;
// Keeping the trees clear of the legend is not worth a smaller frame than this.
const MIN_FRAME_SIZE = 120;
// The trees of a colour within this distance of the nearest one are shown with it.
const GROUP_RADIUS_METRES = 250;

const { MAP_TREE_ZOOM_LEVEL } = useMapConstants();

interface Padding {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

/**
 * Picks a colour in the legend, or brings all colours back when it is picked
 * already. Trees of the other colours are greyed out, and when none of this
 * colour are in view, the map moves to the nearest ones. When there are none
 * at all, nothing changes and the reason is returned.
 *
 * @param legend the legend on screen, which the trees are kept clear of
 */
export function toggleColorFilter(
	color: NeedColor,
	legend: HTMLElement | null,
): NoTreesReason | undefined {
	const {
		colorFilter,
		setColorFilter,
		areOnlyAllAdoptedTreesVisible,
		areLastWateredTreesVisible,
		treeAgeRange,
	} = useFilterStore.getState();

	if (color === colorFilter) {
		setColorFilter(undefined);
		return undefined;
	}

	const trees = useTreesLayerStore.getState().data.features;
	const filters = {
		areOnlyAllAdoptedTreesVisible,
		areLastWateredTreesVisible,
		treeAgeRange,
		colorFilter: color,
	};
	const shownTrees = trees.filter(
		(tree) => !isFilteredOut(tree.properties, filters),
	);
	if (shownTrees.length === 0) {
		return whyNoTrees(color, trees);
	}

	setColorFilter(color);
	const map = useMapStore.getState().map;
	if (map) {
		bringIntoView(map, shownTrees, framePadding(map.getContainer(), legend));
	}
	return undefined;
}

function whyNoTrees(
	color: NeedColor,
	trees: EnrichedTreeFeature[],
): NoTreesReason {
	const hasColor = trees.some(
		({ properties }) => NEED_STATUS_COLOR_TOKEN[properties.need] === color,
	);
	if (hasColor) {
		return "filters";
	}
	const isOffSeason =
		trees.length > 0 &&
		trees.every(({ properties }) => properties.need === "OFF_SEASON");
	return isOffSeason ? "offSeason" : "none";
}

const lngLatOf = ({ geometry }: EnrichedTreeFeature) => {
	const [lng, lat] = geometry.coordinates;
	return new mapboxgl.LngLat(lng, lat);
};

/**
 * Leaves the map alone when some of the trees are in view. Otherwise it moves
 * to the tree nearest to the middle of the view and the others around it, no
 * closer than for an opened tree.
 *
 * A whole colour does not fit on a phone: the map cannot zoom out past the
 * city, and the legend covers part of it.
 */
function bringIntoView(
	map: mapboxgl.Map,
	trees: EnrichedTreeFeature[],
	padding: Padding,
) {
	const { clientWidth, clientHeight } = map.getContainer();
	const frame = {
		left: padding.left,
		top: padding.top,
		right: clientWidth - padding.right,
		bottom: clientHeight - padding.bottom,
	};
	const isInFrame = ({ x, y }: mapboxgl.Point) =>
		x >= frame.left && x <= frame.right && y >= frame.top && y <= frame.bottom;
	if (trees.some((tree) => isInFrame(map.project(lngLatOf(tree))))) {
		return;
	}

	const frameMiddle = map.unproject([
		(frame.left + frame.right) / 2,
		(frame.top + frame.bottom) / 2,
	]);
	let nearest = lngLatOf(trees[0]);
	for (const tree of trees) {
		const position = lngLatOf(tree);
		if (frameMiddle.distanceTo(position) < frameMiddle.distanceTo(nearest)) {
			nearest = position;
		}
	}

	const group = new mapboxgl.LngLatBounds();
	for (const tree of trees) {
		const position = lngLatOf(tree);
		if (nearest.distanceTo(position) <= GROUP_RADIUS_METRES) {
			group.extend(position);
		}
	}

	map.fitBounds(group, {
		padding,
		maxZoom: MAP_TREE_ZOOM_LEVEL,
		// fitBounds would flatten and turn the map otherwise
		pitch: map.getPitch(),
		bearing: map.getBearing(),
		essential: true,
	});
}

/**
 * Keeps the trees below the search bar, clear of an open tree panel, and
 * beside or above the legend, whichever leaves more of the map.
 */
function framePadding(
	container: HTMLElement,
	legend: HTMLElement | null,
): Padding {
	const map = container.getBoundingClientRect();
	const hasTreePanel =
		window.innerWidth >= LARGE_SCREEN_MIN_WIDTH &&
		useTreeStore.getState().selectedTreeId !== undefined;
	const padding: Padding = {
		top: SEARCH_BAR_SPACE,
		right: MARGIN + (hasTreePanel ? TREE_PANEL_WIDTH : 0),
		bottom: MARGIN,
		left: MARGIN,
	};
	if (!legend) {
		return padding;
	}

	const box = legend.getBoundingClientRect();
	const besideLegend = {
		...padding,
		left: Math.max(box.right - map.left + MARGIN, padding.left),
	};
	const aboveLegend = {
		...padding,
		bottom: Math.max(map.bottom - box.top + MARGIN, padding.bottom),
	};

	/** The area left for the trees; 0 when that is too narrow or too low. */
	const room = ({ top, right, bottom, left }: Padding) => {
		const width = map.width - left - right;
		const height = map.height - top - bottom;
		return width >= MIN_FRAME_SIZE && height >= MIN_FRAME_SIZE
			? width * height
			: 0;
	};
	const best =
		room(besideLegend) >= room(aboveLegend) ? besideLegend : aboveLegend;
	return room(best) > 0 ? best : padding;
}
