import { describe, expect, test } from "vitest";
import { computeWaterNeeds } from "../../src/domain/water-needs";

const now = new Date("2027-01-15T12:00:00+08:00");
const daysAgo = (days: number) =>
	new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe("computeWaterNeeds", () => {
	test("JUNIOR with rain and waterings", () => {
		const result = computeWaterNeeds({
			ageClass: "JUNIOR",
			rain30dMm: 40,
			waterings: [
				{ amount: 10, timestamp: daysAgo(1) },
				{ amount: 20, timestamp: daysAgo(2) },
				{ amount: 30, timestamp: daysAgo(3) },
				{ amount: 40, timestamp: daysAgo(4) },
			],
			now,
		});
		expect(result.referenceWaterAmount).toBe(400);
		expect(result.rainSum).toBe(40);
		expect(result.wateringSum).toBe(100);
		expect(result.rainPercentage).toBeCloseTo(0.1);
		expect(result.wateringPercentage).toBeCloseTo(0.25);
		expect(result.otherWateringPercentage).toBe(0);
		expect(result.stillMissingWater).toBe(260);
		expect(result.shouldBeWatered).toBe(true);
	});

	test("rain only", () => {
		const result = computeWaterNeeds({
			ageClass: "JUNIOR",
			rain30dMm: 100,
			waterings: [],
			now,
		});
		expect(result.rainPercentage).toBeCloseTo(0.25);
		expect(result.wateringPercentage).toBe(0);
		expect(result.stillMissingWater).toBe(300);
	});

	test("rain and waterings above the target never exceed 100%", () => {
		const result = computeWaterNeeds({
			ageClass: "JUNIOR",
			rain30dMm: 300,
			waterings: [{ amount: 500, timestamp: daysAgo(1) }],
			now,
		});
		const total =
			result.rainPercentage +
			result.wateringPercentage +
			result.otherWateringPercentage;
		expect(total).toBeLessThanOrEqual(1);
		expect(result.rainPercentage).toBeCloseTo(0.75);
		expect(result.wateringPercentage).toBeCloseTo(0.25);
		expect(result.stillMissingWater).toBe(0);
		expect(result.shouldBeWatered).toBe(false);
	});

	test("rain alone above the target stays at 100%", () => {
		const result = computeWaterNeeds({
			ageClass: "JUNIOR",
			rain30dMm: 800,
			waterings: [{ amount: 100, timestamp: daysAgo(1) }],
			now,
		});
		expect(result.rainPercentage).toBe(1);
		expect(result.wateringPercentage).toBe(0);
	});

	test("waterings older than 30 days are ignored", () => {
		const result = computeWaterNeeds({
			ageClass: "JUNIOR",
			rain30dMm: 0,
			waterings: [
				{ amount: 50, timestamp: daysAgo(31) },
				{ amount: 25, timestamp: daysAgo(29) },
			],
			now,
		});
		expect(result.wateringSum).toBe(25);
	});

	test("BABY: the rest of the ring is covered by the City", () => {
		const result = computeWaterNeeds({
			ageClass: "BABY",
			rain30dMm: 20,
			waterings: [{ amount: 40, timestamp: daysAgo(1) }],
			now,
		});
		expect(result.referenceWaterAmount).toBe(200);
		expect(result.rainPercentage).toBeCloseTo(0.1);
		expect(result.wateringPercentage).toBeCloseTo(0.2);
		expect(result.otherWateringPercentage).toBeCloseTo(0.7);
		expect(result.shouldBeWatered).toBe(false);
	});

	test("SENIOR: the rest of the ring is groundwater", () => {
		const result = computeWaterNeeds({
			ageClass: "SENIOR",
			rain30dMm: 30,
			waterings: [],
			now,
		});
		expect(result.referenceWaterAmount).toBe(300);
		expect(result.otherWateringPercentage).toBeCloseTo(0.9);
		expect(result.shouldBeWatered).toBe(false);
	});

	test("UNKNOWN: no 'other' share, can still need water", () => {
		const result = computeWaterNeeds({
			ageClass: "UNKNOWN",
			rain30dMm: 0,
			waterings: [],
			now,
		});
		expect(result.referenceWaterAmount).toBe(200);
		expect(result.otherWateringPercentage).toBe(0);
		expect(result.shouldBeWatered).toBe(true);
		expect(result.stillMissingWater).toBe(200);
	});
});
