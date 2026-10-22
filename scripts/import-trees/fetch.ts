import type { RawFeature } from "./normalise";

const LAYER_URL =
	"https://services7.arcgis.com/v8XBa2naYNQGOjlG/arcgis/rest/services/PKS_AST_TREESMASTER_PV/FeatureServer/0";
const PAGE_SIZE = 2000;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson<T>(url: string): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status} for ${url}`);
			}
			const body = (await response.json()) as T & {
				error?: { message?: string };
			};
			if (body.error) {
				throw new Error(`ArcGIS error: ${body.error.message ?? "unknown"}`);
			}
			return body;
		} catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) {
				await sleep(1000 * 2 ** (attempt - 1));
			}
		}
	}
	throw new Error(
		`Failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`,
	);
}

export async function fetchExpectedCount(): Promise<number> {
	const body = await fetchJson<{ count: number }>(
		`${LAYER_URL}/query?where=1%3D1&returnCountOnly=true&f=json`,
	);
	return body.count;
}

export async function fetchAllFeatures(
	onProgress?: (fetched: number, expected: number) => void,
): Promise<RawFeature[]> {
	const expected = await fetchExpectedCount();
	const features: RawFeature[] = [];

	for (let offset = 0; ; offset += PAGE_SIZE) {
		const page = await fetchJson<{ features: RawFeature[] }>(
			`${LAYER_URL}/query?where=1%3D1&outFields=*&outSR=4326&orderByFields=OBJECTID` +
				`&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}&f=geojson`,
		);
		features.push(...page.features);
		onProgress?.(features.length, expected);
		if (page.features.length < PAGE_SIZE) {
			break;
		}
	}

	if (features.length !== expected) {
		throw new Error(
			`Fetched ${features.length} features but the service reported ${expected}. ` +
				"The data may have changed during the import; run it again.",
		);
	}
	return features;
}
