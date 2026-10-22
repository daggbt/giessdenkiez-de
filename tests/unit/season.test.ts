import { describe, expect, test } from "vitest";
import {
	formatMonthRange,
	getSeasonMonths,
	isInWateringSeason,
} from "../../src/domain/season";
import { cityDateToInstant, toCityDateString } from "../../src/domain/time";

// 12:00 Perth time (UTC+8, no DST) on the given date
const perthNoon = (date: string) => new Date(`${date}T12:00:00+08:00`);

describe("isInWateringSeason (Nov 1 - Apr 30, wraps over New Year)", () => {
	test.each([
		["2026-11-01", true],
		["2026-10-31", false],
		["2026-12-31", true],
		["2027-01-01", true],
		["2027-04-30", true],
		["2027-05-01", false],
		["2027-07-15", false],
	])("%s -> %s", (date, expected) => {
		expect(isInWateringSeason(perthNoon(date))).toBe(expected);
	});

	test("works for a season that does not wrap", () => {
		const season = { start: { month: 3, day: 1 }, end: { month: 10, day: 31 } };
		expect(isInWateringSeason(perthNoon("2026-03-01"), season)).toBe(true);
		expect(isInWateringSeason(perthNoon("2026-10-31"), season)).toBe(true);
		expect(isInWateringSeason(perthNoon("2026-02-28"), season)).toBe(false);
		expect(isInWateringSeason(perthNoon("2026-11-01"), season)).toBe(false);
	});

	test("uses the city-local date, not the UTC date", () => {
		// 2026-10-31T17:00Z is already Nov 1 (01:00) in Perth
		const instant = new Date("2026-10-31T17:00:00Z");
		expect(instant.getUTCDate()).toBe(31);
		expect(isInWateringSeason(instant)).toBe(true);
	});
});

describe("toCityDateString", () => {
	test("formats in the city time zone", () => {
		expect(toCityDateString(new Date("2026-10-31T17:00:00Z"))).toBe(
			"2026-11-01",
		);
		expect(toCityDateString(new Date("2026-10-31T15:59:00Z"))).toBe(
			"2026-10-31",
		);
	});

	test("keeps time zones apart", () => {
		const instant = new Date("2026-10-31T17:00:00Z");
		expect(toCityDateString(instant, "America/New_York")).toBe("2026-10-31");
		expect(toCityDateString(instant)).toBe("2026-11-01");
		expect(toCityDateString(instant, "America/New_York")).toBe("2026-10-31");
	});

	test("pads month and day", () => {
		expect(toCityDateString(perthNoon("2027-01-05"))).toBe("2027-01-05");
	});
});

describe("getSeasonMonths / formatMonthRange", () => {
	test("the off season is the complement of the season", () => {
		expect(getSeasonMonths()).toEqual({
			season: { start: 11, end: 4 },
			offSeason: { start: 5, end: 10 },
		});
		expect(
			getSeasonMonths({
				start: { month: 3, day: 1 },
				end: { month: 10, day: 31 },
			}).offSeason,
		).toEqual({ start: 11, end: 2 });
	});

	test("formats month names in en-AU", () => {
		expect(formatMonthRange({ start: 5, end: 10 })).toBe("May–October");
		expect(formatMonthRange({ start: 11, end: 4 })).toBe("November–April");
	});
});

describe("cityDateToInstant", () => {
	test("is midday in the city time zone", () => {
		expect(cityDateToInstant("2026-10-22").toISOString()).toBe(
			"2026-10-22T04:00:00.000Z",
		);
		expect(toCityDateString(cityDateToInstant("2027-01-01"))).toBe(
			"2027-01-01",
		);
	});

	test("respects other zones", () => {
		expect(
			cityDateToInstant("2026-01-15", "America/New_York").toISOString(),
		).toBe("2026-01-15T17:00:00.000Z");
	});
});
