import { describe, expect, test } from "vitest";
import {
	councilAt,
	councilIds,
	councils,
	councilsOverlapping,
} from "../../src/config/councils";

describe("councils", () => {
	test.each(councilIds)("picking %s takes the map into its area", (id) => {
		expect(councilAt(councils[id].centre)).toBe(id);
	});

	test("councilsOverlapping finds the councils a part of the map shows", () => {
		// Around the Perth CBD
		expect(councilsOverlapping([115.85, -31.96, 115.87, -31.95])).toEqual([
			"perth",
		]);
		// Zoomed out from the CBD towards Bassendean
		expect(councilsOverlapping([115.85, -31.96, 115.95, -31.9])).toEqual([
			"perth",
			"bassendean",
		]);
		// At sea, west of the coast
		expect(councilsOverlapping([115.6, -32.0, 115.65, -31.95])).toEqual([]);
	});

	test("councilAt prefers the nearer centre where two areas overlap", () => {
		// The north of Cockburn's area reaches into the south of Fremantle's.
		const position: [number, number] = [115.78, -32.075];
		expect(councilsOverlapping([...position, ...position])).toEqual([
			"fremantle",
			"cockburn",
		]);
		expect(councilAt(position)).toBe("fremantle");
		expect(councilAt([115.6, -32.0])).toBeUndefined();
	});
});
