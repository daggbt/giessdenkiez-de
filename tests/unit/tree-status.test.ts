import { describe, expect, test } from "vitest";
import {
	getNeedStatus,
	NEED_STATUS_COLOR_TOKEN,
} from "../../src/domain/tree-status";

const base = {
	inSeason: true,
	ageClass: "JUNIOR",
	rain30dMm: 0,
	watered30dL: 0,
} as const;

describe("getNeedStatus", () => {
	test("off season beats everything", () => {
		expect(getNeedStatus({ ...base, inSeason: false })).toBe("OFF_SEASON");
		expect(getNeedStatus({ ...base, inSeason: false, ageClass: "BABY" })).toBe(
			"OFF_SEASON",
		);
	});

	test("BABY is under council care", () => {
		expect(getNeedStatus({ ...base, ageClass: "BABY" })).toBe("COUNCIL_CARE");
	});

	test("SENIOR is established", () => {
		expect(getNeedStatus({ ...base, ageClass: "SENIOR" })).toBe("ESTABLISHED");
	});

	test("UNKNOWN age", () => {
		expect(getNeedStatus({ ...base, ageClass: "UNKNOWN" })).toBe("UNKNOWN_AGE");
	});

	test("JUNIOR with enough rain + waterings is satisfied", () => {
		expect(getNeedStatus({ ...base, rain30dMm: 100, watered30dL: 300 })).toBe(
			"SATISFIED",
		);
		expect(getNeedStatus({ ...base, rain30dMm: 400 })).toBe("SATISFIED");
	});

	test("JUNIOR with some watering but not enough is partial", () => {
		expect(getNeedStatus({ ...base, watered30dL: 50 })).toBe("PARTIAL");
	});

	test("JUNIOR with nothing is thirsty", () => {
		expect(getNeedStatus(base)).toBe("THIRSTY");
		expect(getNeedStatus({ ...base, rain30dMm: 10 })).toBe("THIRSTY");
	});
});

describe("NEED_STATUS_COLOR_TOKEN", () => {
	test("maps partial to yellow, thirsty to orange, everything else to green", () => {
		expect(NEED_STATUS_COLOR_TOKEN.PARTIAL).toBe("gdk-tree-yellow");
		expect(NEED_STATUS_COLOR_TOKEN.THIRSTY).toBe("gdk-tree-orange");
		for (const status of [
			"OFF_SEASON",
			"COUNCIL_CARE",
			"ESTABLISHED",
			"UNKNOWN_AGE",
			"SATISFIED",
		] as const) {
			expect(NEED_STATUS_COLOR_TOKEN[status]).toBe("gdk-neon-green");
		}
	});
});
