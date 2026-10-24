import { describe, expect, test } from "vitest";
// The expression evaluator mapbox-gl uses, to check the map's view of a filter.
import { featureFilter } from "mapbox-gl/dist/style-spec/index.es.js";
import {
	filteredOut,
	isFilteredOut,
	TreeFilters,
} from "../../src/components/map/tree-filters";
import {
	EnrichedTreeProperties,
	MAX_AGE_BUCKET,
} from "../../src/domain/tree-layer";
import {
	NEED_STATUS_COLOR_TOKEN,
	NeedColor,
	NeedStatus,
} from "../../src/domain/tree-status";

const tree = (
	properties: Partial<EnrichedTreeProperties>,
): EnrichedTreeProperties => ({
	id: "1",
	council: "perth",
	genus: null,
	common_name: null,
	planted_date: null,
	planted_date_precision: "unknown",
	age_years: 3,
	age_bucket: 3,
	age_class: "JUNIOR",
	adopted: false,
	watered_30d_l: 0,
	need: "THIRSTY",
	...properties,
});

const noFilters: TreeFilters = {
	areOnlyAllAdoptedTreesVisible: false,
	areLastWateredTreesVisible: false,
	treeAgeRange: { min: 0, max: MAX_AGE_BUCKET },
	colorFilter: undefined,
};

const statuses = Object.keys(NEED_STATUS_COLOR_TOKEN) as NeedStatus[];
const colors: (NeedColor | undefined)[] = [
	undefined,
	"gdk-neon-green",
	"gdk-tree-yellow",
	"gdk-tree-orange",
];

// Every combination of the properties the filters look at ...
const trees = [-1, 0, 2, 5, MAX_AGE_BUCKET].flatMap((age_bucket) =>
	[false, true].flatMap((adopted) =>
		[0, 40].flatMap((watered_30d_l) =>
			statuses.map((need) =>
				tree({ age_bucket, adopted, watered_30d_l, need }),
			),
		),
	),
);

// ... and of the filters.
const filterSets: TreeFilters[] = [
	{ min: 0, max: MAX_AGE_BUCKET },
	{ min: 0, max: 3 },
	{ min: 2, max: MAX_AGE_BUCKET },
	{ min: 2, max: 5 },
	{ min: 3, max: 3 },
].flatMap((treeAgeRange) =>
	[false, true].flatMap((areOnlyAllAdoptedTreesVisible) =>
		[false, true].flatMap((areLastWateredTreesVisible) =>
			colors.map((colorFilter) => ({
				treeAgeRange,
				areOnlyAllAdoptedTreesVisible,
				areLastWateredTreesVisible,
				colorFilter,
			})),
		),
	),
);

describe("isFilteredOut", () => {
	test("greys out the same trees as the map", () => {
		const disagreements = filterSets.flatMap((filters) => {
			const expression = filteredOut(filters);
			const isGreyOnMap = (properties: EnrichedTreeProperties) =>
				expression
					? featureFilter(expression).filter(
							{ zoom: 14 },
							{ type: 1, properties, geometry: [] },
						)
					: false;
			return trees
				.filter(
					(properties) =>
						isFilteredOut(properties, filters) !== isGreyOnMap(properties),
				)
				.map((properties) => ({ filters, properties }));
		});

		expect(disagreements).toEqual([]);
	});

	test("keeps only the picked colour", () => {
		const filters = { ...noFilters, colorFilter: "gdk-tree-orange" as const };

		expect(isFilteredOut(tree({ need: "THIRSTY" }), filters)).toBe(false);
		expect(isFilteredOut(tree({ need: "PARTIAL" }), filters)).toBe(true);
		expect(isFilteredOut(tree({ need: "ESTABLISHED" }), filters)).toBe(true);
	});

	test("greys out nothing without filters", () => {
		expect(
			trees.some((properties) => isFilteredOut(properties, noFilters)),
		).toBe(false);
		expect(filteredOut(noFilters)).toBeUndefined();
	});
});
