import { create } from "zustand";
import { city } from "../config/city";

export interface DailyWeather {
	/** `YYYY-MM-DD` in the city time zone. */
	date: string[];
	/** Millimetres; days without data count as 0. */
	precipitationMm: number[];
	/** Reference evapotranspiration in mm (kept for the water-balance backlog item). */
	et0Mm: number[];
	/** Maximum temperature in °C (kept for the heatwave-notification backlog item). */
	temperatureMaxC: Array<number | null>;
}

export type WeatherStatus = "loading" | "ready" | "error";

interface WeatherStore {
	status: WeatherStatus;
	/** Rain over the last 30 days plus today, in millimetres. */
	rain30dMm: number;
	daily: DailyWeather;
	/** Fetches once per session; later calls reuse the result. */
	load: () => Promise<void>;
}

const CACHE_KEY = "weather-cache-v1";
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

const emptyDaily: DailyWeather = {
	date: [],
	precipitationMm: [],
	et0Mm: [],
	temperatureMaxC: [],
};

interface OpenMeteoResponse {
	daily: {
		time: string[];
		precipitation_sum: Array<number | null>;
		et0_fao_evapotranspiration: Array<number | null>;
		temperature_2m_max: Array<number | null>;
	};
}

export function buildWeatherUrl(): string {
	const { lat, lng } = city.weatherPoint;
	const params = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lng),
		daily: "precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max",
		past_days: "30",
		forecast_days: "1",
		timezone: city.timeZone,
	});
	return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function parseWeather(response: OpenMeteoResponse): {
	rain30dMm: number;
	daily: DailyWeather;
} {
	const { daily } = response;
	const precipitationMm = daily.precipitation_sum.map((v) => v ?? 0);
	return {
		rain30dMm: precipitationMm.reduce((sum, v) => sum + v, 0),
		daily: {
			date: daily.time,
			precipitationMm,
			et0Mm: daily.et0_fao_evapotranspiration.map((v) => v ?? 0),
			temperatureMaxC: daily.temperature_2m_max,
		},
	};
}

function readCache(): OpenMeteoResponse | undefined {
	try {
		const raw = sessionStorage.getItem(CACHE_KEY);
		if (!raw) {
			return undefined;
		}
		const cached = JSON.parse(raw) as {
			fetchedAt: number;
			response: OpenMeteoResponse;
		};
		return Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS
			? cached.response
			: undefined;
	} catch {
		return undefined;
	}
}

function writeCache(response: OpenMeteoResponse) {
	try {
		sessionStorage.setItem(
			CACHE_KEY,
			JSON.stringify({ fetchedAt: Date.now(), response }),
		);
	} catch {
		// Storage can be unavailable (private mode, blocked site data).
	}
}

let inFlight: Promise<void> | undefined;

export const useWeatherStore = create<WeatherStore>()((set, get) => ({
	status: "loading",
	rain30dMm: 0,
	daily: emptyDaily,

	load: () => {
		if (get().status === "ready") {
			return Promise.resolve();
		}
		inFlight ??= (async () => {
			try {
				let response = readCache();
				if (!response) {
					const result = await fetch(buildWeatherUrl());
					if (!result.ok) {
						throw new Error(`Open-Meteo responded with ${result.status}`);
					}
					response = (await result.json()) as OpenMeteoResponse;
					writeCache(response);
				}
				set({ status: "ready", ...parseWeather(response) });
			} catch (error) {
				console.error(error);
				set({ status: "error", rain30dMm: 0, daily: emptyDaily });
			} finally {
				inFlight = undefined;
			}
		})();
		return inFlight;
	},
}));
