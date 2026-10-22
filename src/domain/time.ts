import { city } from "../config/city";

/**
 * The current instant. In dev builds a `?now=YYYY-MM-DD` URL parameter
 * overrides it, so the in-season UI can be tested outside the season.
 */
export function getNow(): Date {
	if (import.meta.env.DEV && typeof window !== "undefined") {
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
