import { expect } from "@playwright/test";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import {
	findTree,
	IN_SEASON_DATE,
	IN_SEASON_NOW,
	readTreeState,
} from "../trees";
import { OPEN_METEO_URL, weatherResponse } from "../weather";

// The style is served locally, so the map "loads" without a Mapbox request.
testWithoutSplashScreen.use({ mapMode: "stubbed" });

testWithoutSplashScreen.describe("Map", () => {
	testWithoutSplashScreen(
		"should load the City of Perth trees",
		async ({ page }) => {
			await page.goto("/map");

			const map = page.getByTestId("map");
			await expect
				.poll(async () => Number(await map.getAttribute("data-tree-count")), {
					timeout: 20_000,
				})
				.toBeGreaterThanOrEqual(15_000);
		},
	);

	testWithoutSplashScreen(
		"should colour trees by water need when the season is on",
		async ({ page }) => {
			await page.goto("/map?now=2027-01-15");

			await expect
				.poll(
					async () => page.getByTestId("map").getAttribute("data-tree-count"),
					{ timeout: 20_000 },
				)
				.not.toBe("0");

			const counts = await page.evaluate(() => {
				const store = (
					window as unknown as {
						__treesLayer: {
							getState: () => {
								data: {
									features: Array<{ properties: { need: string } }>;
								};
							};
						};
					}
				).__treesLayer.getState();
				const result: Record<string, number> = {};
				for (const { properties } of store.data.features) {
					result[properties.need] = (result[properties.need] ?? 0) + 1;
				}
				return result;
			});

			expect(counts.THIRSTY).toBeGreaterThan(500);
			expect(counts.ESTABLISHED).toBeGreaterThan(10_000);
			expect(counts.OFF_SEASON).toBeUndefined();
		},
	);

	testWithoutSplashScreen(
		"should be all green outside the watering season",
		async ({ page }) => {
			await page.goto("/map?now=2026-10-22");

			await expect
				.poll(
					async () => page.getByTestId("map").getAttribute("data-tree-count"),
					{ timeout: 20_000 },
				)
				.not.toBe("0");

			const needs = await page.evaluate(() => {
				const store = (
					window as unknown as {
						__treesLayer: {
							getState: () => {
								data: {
									features: Array<{ properties: { need: string } }>;
								};
							};
						};
					}
				).__treesLayer.getState();
				return [...new Set(store.data.features.map((f) => f.properties.need))];
			});

			expect(needs).toEqual(["OFF_SEASON"]);
		},
	);

	testWithoutSplashScreen(
		"should draw the trees without waiting for slow rain data",
		async ({ page }) => {
			const tree = findTree("JUNIOR", { now: IN_SEASON_NOW });

			// Open-Meteo hangs; enough rain to satisfy every tree comes later.
			let answerWeather = () => {};
			const isWeatherAnswered = new Promise<void>((resolve) => {
				answerWeather = resolve;
			});
			await page.route(OPEN_METEO_URL, async (route) => {
				await isWeatherAnswered;
				await route.fulfill({ json: weatherResponse({ rainMm: 500 }) });
			});

			await page.goto(`/map?now=${IN_SEASON_DATE}`);

			await expect
				.poll(() => readTreeState(page, tree.id), { timeout: 10_000 })
				.toMatchObject({ need: "THIRSTY" });
			await expect(page.getByTestId("map")).not.toHaveAttribute(
				"data-tree-count",
				"0",
			);

			answerWeather();

			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ need: "SATISFIED" });
		},
	);

	testWithoutSplashScreen(
		"should open the tree panel from a deep link",
		async ({ page }) => {
			const tree = findTree("SENIOR");
			await page.goto(`/map?treeId=${tree.id}`);

			await expect(page.getByText(tree.common_name ?? "")).toBeVisible();
			await expect(page.getByTestId("age")).toBeVisible();
		},
	);
});

testWithoutSplashScreen.describe("Map - when it cannot be shown", () => {
	testWithoutSplashScreen(
		"should explain a missing WebGL and keep the other pages working",
		async ({ page }) => {
			await page.addInitScript(() => {
				const getContext = HTMLCanvasElement.prototype.getContext;
				HTMLCanvasElement.prototype.getContext = function (
					this: HTMLCanvasElement,
					...args: Parameters<typeof getContext>
				) {
					return String(args[0]).startsWith("webgl")
						? null
						: getContext.apply(this, args);
				} as typeof getContext;
			});

			await page.goto("/map");

			await expect(page.getByRole("alert")).toContainText(
				"This browser cannot show the map",
			);

			await page.getByRole("link", { name: "Profile" }).click();
			await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should say so when Mapbox rejects the token",
		async ({ page }) => {
			await page.route("**/api.mapbox.com/styles/v1/**", (route) =>
				route.fulfill({
					status: 401,
					json: { message: "Not Authorized - Invalid Token" },
				}),
			);

			await page.goto("/map");

			await expect(page.getByRole("alert")).toContainText(
				"The map could not be loaded",
			);
			await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
		},
	);
});
