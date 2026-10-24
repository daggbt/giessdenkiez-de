import { afterEach, describe, expect, test, vi } from "vitest";
import { parseCityDate } from "../../src/domain/time";

describe("parseCityDate", () => {
	test("is midday of the day in Perth", () => {
		expect(parseCityDate("2027-01-15")?.toISOString()).toBe(
			"2027-01-15T04:00:00.000Z",
		);
	});

	test.each([undefined, null, "", "2027-1-15", "2027-02-30", "15/01/2027"])(
		"is undefined for %j",
		(value) => {
			expect(parseCityDate(value)).toBeUndefined();
		},
	);
});

describe("getNow", () => {
	// getNow reads VITE_APP_DATE once per module.
	const importGetNow = async () => {
		vi.resetModules();
		return (await import("../../src/domain/time")).getNow;
	};

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	test("is the day of VITE_APP_DATE when the app is started with it", async () => {
		vi.stubEnv("MODE", "development");
		vi.stubEnv("VITE_APP_DATE", "2027-01-15");
		const getNow = await importGetNow();

		expect(getNow().toISOString()).toBe("2027-01-15T04:00:00.000Z");
	});

	test("is now when VITE_APP_DATE is not a date, and says so", async () => {
		vi.stubEnv("MODE", "development");
		vi.stubEnv("VITE_APP_DATE", "15/01/2027");
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const getNow = await importGetNow();

		expect(Math.abs(getNow().getTime() - Date.now())).toBeLessThan(1000);
		getNow();
		expect(warn).toHaveBeenCalledOnce();
	});

	test("ignores VITE_APP_DATE in tests, which set their dates themselves", async () => {
		vi.stubEnv("VITE_APP_DATE", "2027-01-15");
		const getNow = await importGetNow();

		expect(Math.abs(getNow().getTime() - Date.now())).toBeLessThan(1000);
	});
});
