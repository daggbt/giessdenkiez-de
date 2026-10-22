import { Page } from "@playwright/test";

export const OPEN_METEO_URL = "https://api.open-meteo.com/**";

/** An Open-Meteo answer with `rainMm` of rain over the last 31 days. */
export function weatherResponse({ rainMm = 0 } = {}) {
	const days = 31;
	return {
		daily: {
			time: Array.from({ length: days }, (_, day) =>
				new Date(Date.UTC(2027, 0, day - 15)).toISOString().slice(0, 10),
			),
			precipitation_sum: Array.from({ length: days }, (_, day) =>
				day === 0 ? rainMm : 0,
			),
			et0_fao_evapotranspiration: new Array(days).fill(5),
			temperature_2m_max: new Array(days).fill(30),
		},
	};
}

/**
 * Answers the weather request locally, so tests neither depend on nor load
 * the free Open-Meteo service. Tests that need other weather register their
 * own route afterwards, which takes precedence.
 */
export async function stubWeather(page: Page, options?: { rainMm?: number }) {
	await page.route(OPEN_METEO_URL, (route) =>
		route.fulfill({ json: weatherResponse(options) }),
	);
}
