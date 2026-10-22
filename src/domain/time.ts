import { city } from "../config/city";

/**
 * The current instant. In dev builds (and in the production-like builds used by
 * the end-to-end tests, `VITE_PW_TEST=true`) a `?now=YYYY-MM-DD` URL parameter
 * overrides it, so the in-season UI can be tested outside the season.
 */
export function getNow(): Date {
	const isOverrideAllowed =
		import.meta.env?.DEV || import.meta.env?.VITE_PW_TEST === "true";
	if (isOverrideAllowed && typeof window !== "undefined") {
		const override = new URL(window.location.href).searchParams.get("now");
		if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
			// Midday in the city's time zone (UTC+8 in Perth) avoids edge effects.
			const date = new Date(`${override}T12:00:00+08:00`);
			if (!Number.isNaN(date.getTime())) {
				return date;
			}
		}
	}
	return new Date();
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
