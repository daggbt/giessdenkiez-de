import { readFileSync } from "node:fs";
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
}

/**
 * Picks a tree of the given age class from the committed GeoJSON. Doing it at
 * run time (instead of hard-coding ids) keeps the tests valid as trees age.
 */
export function findTree(
	ageClass: AgeClass,
	{ now = new Date(), genus, precision }: FindTreeOptions = {},
): TreeProperties {
	const tree = collection.features
		.map((feature) => feature.properties)
		.find(
			(properties) =>
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
			`No ${ageClass} tree (${JSON.stringify({ genus, precision })}) found in public/data/trees.geojson`,
		);
	}
	return tree;
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
