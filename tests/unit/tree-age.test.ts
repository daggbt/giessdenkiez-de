import { describe, expect, test } from "vitest";
import {
	classifyAgeYears,
	classifyTreeAge,
	getTreeAge,
	TreePlantingInfo,
} from "../../src/domain/tree-age";

const now = new Date("2027-01-15T12:00:00+08:00");

const day = (planted_date: string): TreePlantingInfo => ({
	planted_date,
	planted_date_precision: "day",
});

describe("classifyTreeAge", () => {
	test("planted 6 months ago is BABY", () => {
		expect(classifyTreeAge(day("2026-07-15"), now)).toBe("BABY");
	});

	test("planted 3 years ago is JUNIOR", () => {
		expect(classifyTreeAge(day("2024-01-15"), now)).toBe("JUNIOR");
	});

	test("planted 8 years ago is SENIOR", () => {
		expect(classifyTreeAge(day("2019-01-15"), now)).toBe("SENIOR");
	});

	test("before_2019 is SENIOR", () => {
		expect(
			classifyTreeAge(
				{ planted_date: null, planted_date_precision: "before_2019" },
				now,
			),
		).toBe("SENIOR");
	});

	test("unknown precision is UNKNOWN", () => {
		expect(
			classifyTreeAge(
				{ planted_date: null, planted_date_precision: "unknown" },
				now,
			),
		).toBe("UNKNOWN");
	});

	test("year precision 2008-01-01 is SENIOR", () => {
		expect(
			classifyTreeAge(
				{ planted_date: "2008-01-01", planted_date_precision: "year" },
				now,
			),
		).toBe("SENIOR");
	});

	test("a planting date in the future is UNKNOWN", () => {
		expect(classifyTreeAge(day("2027-06-01"), now)).toBe("UNKNOWN");
	});

	test("a lower bound below the 'needs help' limit is UNKNOWN", () => {
		// before_2019 evaluated shortly after the capture date
		expect(
			classifyTreeAge(
				{ planted_date: null, planted_date_precision: "before_2019" },
				new Date("2020-01-01T12:00:00+08:00"),
			),
		).toBe("UNKNOWN");
	});
});

describe("classifyAgeYears band edges", () => {
	test.each([
		[0, "BABY"],
		[1.99, "BABY"],
		[2.0, "JUNIOR"],
		[4.99, "JUNIOR"],
		[5.0, "SENIOR"],
		[30, "SENIOR"],
	] as const)("%s years -> %s", (years, expected) => {
		expect(classifyAgeYears(years)).toBe(expected);
	});

	test("null is UNKNOWN", () => {
		expect(classifyAgeYears(null)).toBe("UNKNOWN");
	});
});

describe("getTreeAge", () => {
	test("computes fractional years", () => {
		const { ageYears, isLowerBound } = getTreeAge(day("2025-01-15"), now);
		expect(ageYears).toBeCloseTo(2, 1);
		expect(isLowerBound).toBe(false);
	});

	test("before_2019 measures from the inventory capture date and is a lower bound", () => {
		const { ageYears, isLowerBound } = getTreeAge(
			{ planted_date: null, planted_date_precision: "before_2019" },
			now,
		);
		expect(ageYears).toBeCloseTo(7.68, 1);
		expect(isLowerBound).toBe(true);
	});

	test("a tree planted today has age 0, not null", () => {
		// 06:00 Perth on 2026-10-22 is still 2026-10-21 in UTC
		const early = new Date("2026-10-22T06:00:00+08:00");
		expect(getTreeAge(day("2026-10-22"), early).ageYears).toBe(0);
	});

	test("future and unknown dates have no age", () => {
		expect(getTreeAge(day("2030-01-01"), now).ageYears).toBeNull();
		expect(
			getTreeAge({ planted_date: null, planted_date_precision: "unknown" }, now)
				.ageYears,
		).toBeNull();
	});
});
