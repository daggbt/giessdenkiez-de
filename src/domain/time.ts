import { city } from "../config/city";

/**
 * The current instant, unless the app is told which day it is, so that the
 * in-season UI can be seen and tested outside the season:
 *
 * - `?now=YYYY-MM-DD` in the URL, in dev builds and in the production-like
 *   builds of the end-to-end tests (`VITE_PW_TEST=true`), which set their
 *   dates this way;
 * - `VITE_APP_DATE=YYYY-MM-DD` when starting or building the app, e.g.
 *   `VITE_APP_DATE=2027-01-15 npm run dev`. The tests ignore it.
 *
 * Either means midday of that day in the city, which avoids edge effects. Only
 * the season and the trees' ages go by it; waterings and rain keep real dates.
 */
export function getNow(): Date {
	const isTest =
		import.meta.env?.MODE === "test" ||
		import.meta.env?.VITE_PW_TEST === "true";
	if ((import.meta.env?.DEV || isTest) && typeof window !== "undefined") {
		const override = parseCityDate(
			new URL(window.location.href).searchParams.get("now"),
		);
		if (override) {
			return override;
		}
	}
	return (isTest ? null : getAppDate()) ?? new Date();
}

let appDate: Date | null | undefined;

/** `VITE_APP_DATE`, read once; null when it is not set or not a date. */
function getAppDate(): Date | null {
	if (appDate === undefined) {
		const value: string | undefined = import.meta.env?.VITE_APP_DATE;
		appDate = parseCityDate(value) ?? null;
		if (value && !appDate) {
			console.warn(
				`VITE_APP_DATE=${value} is not a date like 2027-01-15, so the app uses today's date.`,
			);
		}
	}
	return appDate;
}

/** Midday of a city-local `YYYY-MM-DD`; undefined for anything else. */
export function parseCityDate(
	value: string | null | undefined,
): Date | undefined {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return undefined;
	}
	const instant = cityDateToInstant(value);
	// Date.UTC would turn 2027-02-30 into a day in March.
	return toCityDateString(instant) === value ? instant : undefined;
}

/**
 * Building an `Intl.DateTimeFormat` takes far longer than formatting with one,
 * and the map works out a date for every tree, so keep one per time zone.
 */
function perTimeZone(options: Intl.DateTimeFormatOptions) {
	const formatters = new Map<string, Intl.DateTimeFormat>();
	return (timeZone: string) => {
		let formatter = formatters.get(timeZone);
		if (!formatter) {
			formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
			formatters.set(timeZone, formatter);
		}
		return formatter;
	};
}

const dateFormatter = perTimeZone({
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

const dateTimeFormatter = perTimeZone({
	hourCycle: "h23",
	year: "numeric",
	month: "numeric",
	day: "numeric",
	hour: "numeric",
	minute: "numeric",
	second: "numeric",
});

function formatParts(formatter: Intl.DateTimeFormat, date: Date) {
	const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
	for (const { type, value } of formatter.formatToParts(date)) {
		parts[type] = value;
	}
	return parts;
}

/** `YYYY-MM-DD` of the given instant in the city's time zone. */
export function toCityDateString(
	date: Date,
	timeZone: string = city.timeZone,
): string {
	// Assembled from the parts, so no locale's date pattern is relied on.
	const { year, month, day } = formatParts(dateFormatter(timeZone), date);
	return `${year}-${month}-${day}`;
}

/**
 * Midday of the given city-local date (`YYYY-MM-DD`) as an instant. Used for the
 * timestamp of a watering that was logged for a past day.
 */
export function cityDateToInstant(
	date: string,
	timeZone: string = city.timeZone,
): Date {
	const [year, month, day] = date.split("-").map(Number);
	const guess = Date.UTC(year, month - 1, day, 12);

	const parts = formatParts(dateTimeFormatter(timeZone), new Date(guess));
	const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts[type]);

	// What the wall clock shows at `guess` minus `guess` is the zone's offset.
	const wallClockAsUtc = Date.UTC(
		part("year"),
		part("month") - 1,
		part("day"),
		part("hour"),
		part("minute"),
		part("second"),
	);
	return new Date(guess - (wallClockAsUtc - guess));
}
