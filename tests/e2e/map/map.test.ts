import { expect } from "@playwright/test";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import { findTree } from "../trees";

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
		"should open the tree panel from a deep link",
		async ({ page }) => {
			const tree = findTree("SENIOR");
			await page.goto(`/map?treeId=${tree.id}`);

			await expect(page.getByText(tree.common_name ?? "")).toBeVisible();
			await expect(page.getByTestId("age")).toBeVisible();
		},
	);
});
