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
