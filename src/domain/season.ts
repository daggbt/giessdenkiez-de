import { city } from "../config/city";
import { toCityDateString } from "./time";

export interface WateringSeason {
	readonly start: { readonly month: number; readonly day: number };
	readonly end: { readonly month: number; readonly day: number };
}

const monthDay = (month: number, day: number) => month * 100 + day;

/**
 * Whether `now` falls in the watering season, judged by the city-local date.
 * Months are 1-based; the range is inclusive and may wrap over New Year.
 */
export function isInWateringSeason(
	now: Date,
	season: WateringSeason = city.wateringSeason,
	timeZone: string = city.timeZone,
): boolean {
	const [, month, day] = toCityDateString(now, timeZone).split("-").map(Number);
	const today = monthDay(month, day);
	const start = monthDay(season.start.month, season.start.day);
	const end = monthDay(season.end.month, season.end.day);

	return start <= end
		? today >= start && today <= end
		: today >= start || today <= end;
}

export interface MonthRange {
	/** 1-based month numbers, inclusive; may wrap over New Year. */
	start: number;
	end: number;
}

/**
 * The months inside and outside the season. Assumes the season starts and
 * ends at month boundaries, which is how the city config is meant to be used.
 */
export function getSeasonMonths(season: WateringSeason = city.wateringSeason): {
	season: MonthRange;
	offSeason: MonthRange;
} {
	return {
		season: { start: season.start.month, end: season.end.month },
		offSeason: {
			start: (season.end.month % 12) + 1,
			end: ((season.start.month + 10) % 12) + 1,
		},
	};
}

/** "November–April" */
export function formatMonthRange(
	range: MonthRange,
	locale: string = city.locale,
): string {
	const formatter = new Intl.DateTimeFormat(locale, {
		month: "long",
		timeZone: "UTC",
	});
	const name = (month: number) =>
		formatter.format(new Date(Date.UTC(2000, month - 1, 1)));
	return `${name(range.start)}\u2013${name(range.end)}`;
}
