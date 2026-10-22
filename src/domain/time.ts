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

/** `YYYY-MM-DD` of the given instant in the city's time zone. */
export function toCityDateString(
	date: Date,
	timeZone: string = city.timeZone,
): string {
	// The "en-CA" locale formats dates as YYYY-MM-DD.
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
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

	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hourCycle: "h23",
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
	}).formatToParts(new Date(guess));
	const part = (type: string) =>
		Number(parts.find((p) => p.type === type)?.value);

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
