import { describe, expect, test } from "vitest";
import { isInWateringSeason } from "../../src/domain/season";
import { toCityDateString } from "../../src/domain/time";

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
});
