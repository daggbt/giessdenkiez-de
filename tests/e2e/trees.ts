import { readFileSync } from "node:fs";
import type { CouncilId } from "../../src/config/councils";
import {
	AgeClass,
	classifyTreeAge,
	PlantedDatePrecision,
} from "../../src/domain/tree-age";
import { TreeProperties } from "../../src/domain/tree-layer";

const collection = JSON.parse(
	readFileSync("public/data/trees.geojson", "utf-8"),
) as {
	features: Array<{
		geometry: { coordinates: [number, number] };
		properties: TreeProperties;
	}>;
};

/** Use with `?now=` to see the app inside the watering season. */
export const IN_SEASON_DATE = "2027-01-15";
export const IN_SEASON_NOW = new Date(`${IN_SEASON_DATE}T12:00:00+08:00`);

interface FindTreeOptions {
	/** The date the tree's age class is judged at; defaults to the real now. */
	now?: Date;
	genus?: string;
	precision?: PlantedDatePrecision;
	/** Defaults to the City of Perth, whose trees come first in the file. */
	council?: CouncilId;
}

/**
 * Picks a tree of the given age class from the committed GeoJSON. Doing it at
 * run time (instead of hard-coding ids) keeps the tests valid as trees age.
 */
export function findTree(
	ageClass: AgeClass,
	{
		now = new Date(),
		genus,
		precision,
		council = "perth",
	}: FindTreeOptions = {},
): TreeProperties {
	const tree = collection.features
		.map((feature) => feature.properties)
		.find(
			(properties) =>
				properties.council === council &&
				properties.common_name !== null &&
				properties.genus !== null &&
				(genus === undefined || properties.genus === genus) &&
				(precision === undefined ||
					properties.planted_date_precision === precision) &&
				classifyTreeAge(properties, now) === ageClass &&
				// the age-dependent classes need a precise planting date
				(ageClass === "SENIOR" ||
					ageClass === "UNKNOWN" ||
					properties.planted_date_precision === "day"),
		);
	if (!tree) {
		throw new Error(
			`No ${ageClass} tree (${JSON.stringify({ genus, precision, council })}) found in public/data/trees.geojson`,
		);
	}
	return tree;
}

export interface TreeLocation {
	id: string;
	coordinates: [number, number];
}

/** Where all trees of an age class are, unlike `findTree` also those with gaps in their data. */
export function locateTrees(ageClass: AgeClass, now: Date): TreeLocation[] {
	return collection.features
		.filter(({ properties }) => classifyTreeAge(properties, now) === ageClass)
		.map(({ properties, geometry }) => ({
			id: properties.id,
			coordinates: geometry.coordinates,
		}));
}

/** The westernmost, southernmost, easternmost and northernmost trees. */
export function edgeTrees(): TreeLocation[] {
	const trees = collection.features.map(({ properties, geometry }) => ({
		id: properties.id,
		coordinates: geometry.coordinates,
	}));
	const extreme = (score: (tree: TreeLocation) => number) =>
		trees.reduce((best, tree) => (score(tree) > score(best) ? tree : best));
	return [
		extreme(({ coordinates: [lng] }) => -lng),
		extreme(({ coordinates: [, lat] }) => -lat),
		extreme(({ coordinates: [lng] }) => lng),
		extreme(({ coordinates: [, lat] }) => lat),
	];
}

/** Metres between two `[lng, lat]` points; precise enough within a city. */
export function metresBetween(
	[lngA, latA]: [number, number],
	[lngB, latB]: [number, number],
): number {
	const metresPerDegree = 111_320;
	const x =
		(lngA - lngB) *
		metresPerDegree *
		Math.cos(((latA + latB) / 2) * (Math.PI / 180));
	const y = (latA - latB) * metresPerDegree;
	return Math.hypot(x, y);
}

/** `[lng, lat]` of a tree in the committed GeoJSON. */
export function treeCoordinates(treeId: string): [number, number] {
	const feature = collection.features.find(
		(candidate) => candidate.properties.id === treeId,
	);
	if (!feature) {
		throw new Error(`Tree ${treeId} not found in public/data/trees.geojson`);
	}
	return feature.geometry.coordinates;
}

interface TreesLayerHandle {
	getState: () => {
		status: string;
		data: {
			features: Array<{
				properties: { id: string; need: string; adopted: boolean };
			}>;
		};
	};
}

/** Reads the computed state of a tree from the app (see `trees-layer-store.ts`). */
export async function readTreeState(
	page: import("@playwright/test").Page,
	treeId: string,
) {
	return page.evaluate((id) => {
		const layer = (window as unknown as { __treesLayer?: TreesLayerHandle })
			.__treesLayer;
		const state = layer?.getState();
		if (!state || state.status !== "ready") {
			return undefined;
		}
		return state.data.features.find((f) => f.properties.id === id)?.properties;
	}, treeId);
}
