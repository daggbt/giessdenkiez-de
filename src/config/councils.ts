// The councils whose public trees are on the map. Their tree inventories are
// fetched by `npm run import:trees` (see scripts/import-trees/sources.ts).

export type CouncilId = "perth" | "fremantle" | "cockburn" | "bassendean";

/** `[minLng, minLat, maxLng, maxLat]` */
export type BoundingBox = [number, number, number, number];

/** `[lng, lat]` */
export type Position = [number, number];

export interface Council {
	name: string;
	/** The place, e.g. "Perth" for the City of Perth. */
	shortName: string;
	/** Years the council waters a new tree; residents' help starts after that. */
	councilCareMaxYears: number;
	/** Where the council says how long it waters new trees. */
	careSource: { label: string; url: string };
	reportProblemUrl: string;
	treeData: {
		label: string;
		url: string;
		/** null: the council publishes the layer without stating a licence. */
		licence: string | null;
	};
	/** Where its trees are, from the import report. */
	bbox: BoundingBox;
	/**
	 * Where picking the council takes the map: for the City of Perth the CBD,
	 * as the map's default centre in .env.sample, for the others the middle of
	 * the 500 m square with the most of its trees (October 2026 import).
	 */
	centre: Position;
}

export const councils: Record<CouncilId, Council> = {
	perth: {
		name: "City of Perth",
		shortName: "Perth",
		councilCareMaxYears: 2,
		careSource: {
			label: "Urban Forest Plan FAQs",
			url: "https://engage.perth.wa.gov.au/urban-forest-plan/faqs",
		},
		// TODO(confirm): exact page (Q6)
		reportProblemUrl: "https://perth.wa.gov.au/",
		treeData: {
			label: "Trees in the City",
			url: "https://www.data.gov.au/data/dataset/perth-trees-in-the-city",
			// TODO(confirm): licence version (Q7)
			licence: "CC BY",
		},
		bbox: [115.810883, -31.990039, 115.887785, -31.942122],
		centre: [115.8575, -31.9535],
	},
	fremantle: {
		name: "City of Fremantle",
		shortName: "Fremantle",
		councilCareMaxYears: 2,
		careSource: {
			label: "Request a street tree",
			url: "https://www.fremantle.wa.gov.au/waste-and-environment/trees-landscapes-and-verges/trees/request-a-street-tree/",
		},
		reportProblemUrl: "https://www.fremantle.wa.gov.au/contact-us/",
		treeData: {
			label: "Trees from Forestree",
			url: "https://www.arcgis.com/home/item.html?id=6cf957db0a7346da8b99e6fb59691d31",
			licence: null,
		},
		bbox: [115.740032, -32.07953, 115.803365, -32.021577],
		centre: [115.7677, -32.0574],
	},
	cockburn: {
		name: "City of Cockburn",
		shortName: "Cockburn",
		councilCareMaxYears: 3,
		careSource: {
			label: "Request a street tree",
			url: "https://www.cockburn.wa.gov.au/Environment-and-Waste/Street-Trees-and-Verges/Request-a-Street-Tree",
		},
		reportProblemUrl:
			"https://www.cockburn.wa.gov.au/City-and-Council/Contact-us/Report-a-problem",
		treeData: {
			label: "Street Trees",
			url: "https://www.arcgis.com/home/item.html?id=4e25763b23fe47c1bb928920152789a9",
			licence: null,
		},
		bbox: [115.753488, -32.18057, 115.914741, -32.073752],
		centre: [115.8124, -32.1275],
	},
	bassendean: {
		name: "Town of Bassendean",
		shortName: "Bassendean",
		// "watered during its first two summers"
		councilCareMaxYears: 2,
		careSource: {
			label: "2025 Winter Tree Planting Program",
			url: "https://www.bassendean.wa.gov.au/news/2025-winter-tree-planting-program/1079",
		},
		reportProblemUrl:
			"https://www.bassendean.wa.gov.au/your-town/work-with-us/contact-us.aspx",
		treeData: {
			label: "All Trees",
			url: "https://www.arcgis.com/home/item.html?id=5973d2d7b04648a4bb000fe13cc4db74",
			licence: null,
		},
		bbox: [115.926816, -31.924408, 115.962563, -31.887474],
		centre: [115.9524, -31.9025],
	},
};

export const councilIds = Object.keys(councils) as CouncilId[];

/** The area of all councils' trees. */
export const treeAreaBbox: BoundingBox = councilIds.reduce<BoundingBox>(
	([minLng, minLat, maxLng, maxLat], id) => {
		const [west, south, east, north] = councils[id].bbox;
		return [
			Math.min(minLng, west),
			Math.min(minLat, south),
			Math.max(maxLng, east),
			Math.max(maxLat, north),
		];
	},
	[Infinity, Infinity, -Infinity, -Infinity],
);

const MAP_AREA_PADDING = 0.1;

/** How far the map can be moved, and where the search looks: the trees' area, padded by 10 % so edge trees are reachable. */
export const mapAreaBbox: BoundingBox = (() => {
	const [minLng, minLat, maxLng, maxLat] = treeAreaBbox;
	const lngPadding = (maxLng - minLng) * MAP_AREA_PADDING;
	const latPadding = (maxLat - minLat) * MAP_AREA_PADDING;
	return [
		minLng - lngPadding,
		minLat - latPadding,
		maxLng + lngPadding,
		maxLat + latPadding,
	];
})();

/** The councils whose trees' area overlaps `bbox`, e.g. the part of the map in view. */
export const councilsOverlapping = ([west, south, east, north]: BoundingBox) =>
	councilIds.filter((id) => {
		const [minLng, minLat, maxLng, maxLat] = councils[id].bbox;
		return (
			minLng <= east && maxLng >= west && minLat <= north && maxLat >= south
		);
	});

/**
 * The council whose trees' area `position` is in; where two areas overlap, the
 * one with the nearer centre.
 */
export function councilAt([lng, lat]: Position): CouncilId | undefined {
	const distance = (id: CouncilId) => {
		const [centreLng, centreLat] = councils[id].centre;
		return Math.hypot(
			(lng - centreLng) * Math.cos((lat * Math.PI) / 180),
			lat - centreLat,
		);
	};
	return councilsOverlapping([lng, lat, lng, lat]).sort(
		(a, b) => distance(a) - distance(b),
	)[0];
}

/** "A, B and C" */
export const formatList = (items: string[]) =>
	items.length < 2
		? items.join("")
		: `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** "City of Perth, City of Fremantle, … and Town of Bassendean" */
export const councilNames = formatList(
	councilIds.map((id) => councils[id].name),
);
