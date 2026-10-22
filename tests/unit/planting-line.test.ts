import { describe, expect, test } from "vitest";
import { formatPlantingLine } from "../../src/components/tree-detail/planting-line";
import { en } from "../../src/i18n/en";

const now = new Date("2027-01-15T12:00:00+08:00");
const texts = en.treeDetail.planted;

describe("formatPlantingLine", () => {
	test("day precision shows the date and the distance", () => {
		expect(
			formatPlantingLine(
				{ planted_date: "2023-07-03", planted_date_precision: "day" },
				now,
				texts,
			),
		).toBe("Planted 3 July 2023 (over 3 years ago)");
	});

	test("recent plantings", () => {
		expect(
			formatPlantingLine(
				{ planted_date: "2027-01-15", planted_date_precision: "day" },
				now,
				texts,
			),
		).toBe("Planted 15 January 2027 (today)");
		expect(
			formatPlantingLine(
				{ planted_date: "2026-11-15", planted_date_precision: "day" },
				now,
				texts,
			),
		).toContain("2 months ago");
	});

	test("year precision", () => {
		expect(
			formatPlantingLine(
				{ planted_date: "2008-01-01", planted_date_precision: "year" },
				now,
				texts,
			),
		).toBe("Planted in 2008");
	});

	test("before 2019", () => {
		expect(
			formatPlantingLine(
				{ planted_date: null, planted_date_precision: "before_2019" },
				now,
				texts,
			),
		).toBe("Planted before 2019");
	});

	test("unknown", () => {
		expect(
			formatPlantingLine(
				{ planted_date: null, planted_date_precision: "unknown" },
				now,
				texts,
			),
		).toBe("Planting date unknown");
	});
});
