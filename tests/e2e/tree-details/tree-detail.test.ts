import { expect } from "@playwright/test";
import { city } from "../../../src/config/city";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import { findTree, IN_SEASON_DATE, IN_SEASON_NOW } from "../trees";

// The tree detail panel only renders once the map has loaded; the stubbed style
// gets it there without talking to Mapbox.
testWithoutSplashScreen.use({ mapMode: "stubbed" });

testWithoutSplashScreen.describe("Tree detail view", () => {
	testWithoutSplashScreen(
		"should show a tree the City still waters",
		async ({ page }) => {
			// In the season, so the status is about the City, not the season.
			const tree = findTree("BABY", { now: IN_SEASON_NOW });
			await page.goto(`/map?now=${IN_SEASON_DATE}&treeId=${tree.id}`);

			await expect(
				page.getByText("Tree information", { exact: true }),
			).toBeVisible();
			await expect(
				page.getByText(tree.common_name ?? "").first(),
			).toBeVisible();
			await expect(
				page.getByText(
					"The City of Perth waters new trees for their first 2 years, so this tree does not need your help yet.",
				),
			).toBeVisible();
			await expect(page.getByTestId("tree-status")).toHaveText(
				"Watered by the City of Perth: no need to water yet",
			);

			// Trees the City waters cannot be adopted-for-watering or watered
			await expect(page.getByTestId("water-tree-button")).toBeDisabled();

			// Planted recently, with a precise date
			await expect(page.getByTestId("age")).toContainText(/^Planted .+ ago\)$/);

			await expect(page.getByText("Report a problem")).toBeVisible();
			const link = page.getByRole("link", {
				name: "Contact the City of Perth",
			});
			expect(await link.getAttribute("href")).toBe(city.reportProblemUrl);
		},
	);

	testWithoutSplashScreen(
		"should show a tree that needs residents' help in the watering season",
		async ({ page }) => {
			const tree = findTree("JUNIOR", { now: IN_SEASON_NOW });
			await page.goto(`/map?now=${IN_SEASON_DATE}&treeId=${tree.id}`);

			// The weather is stubbed without rain, so all 400 litres are missing.
			await expect(page.getByTestId("tree-status")).toHaveText(
				"Thirsty: still needs about 400 litres",
			);
			await expect(
				page.getByText("Needs 400 litres over 30 days"),
			).toBeVisible();
			await expect(page.getByTestId("water-progress-circle")).toBeVisible();
			await expect(page.getByTestId("water-tree-button")).toBeDisabled(); // logged out
		},
	);

	testWithoutSplashScreen(
		"should explain that nothing is needed outside the season",
		async ({ page }) => {
			const tree = findTree("JUNIOR", { now: IN_SEASON_NOW });
			await page.goto(`/map?now=2026-07-15&treeId=${tree.id}`);

			await expect(page.getByTestId("tree-status")).toHaveText(
				"Outside the watering season. The season runs November–April; until then, no need to water.",
			);

			await expect(
				page.getByText("Outside the watering season (May–October)"),
			).toBeVisible();
			await expect(
				page.getByText("Outside the watering season").first(),
			).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should say when a tree was planted before 2019",
		async ({ page }) => {
			const tree = findTree("SENIOR", { precision: "before_2019" });
			await page.goto(`/map?treeId=${tree.id}`);

			await expect(page.getByTestId("age")).toHaveText("Planted before 2019");
		},
	);

	testWithoutSplashScreen(
		"should say when the planting date is unknown",
		async ({ page }) => {
			const tree = findTree("UNKNOWN");
			await page.goto(`/map?treeId=${tree.id}`);

			await expect(page.getByTestId("age")).toHaveText("Planting date unknown");
		},
	);

	testWithoutSplashScreen(
		"should show the species card of a common genus",
		async ({ page }) => {
			const tree = findTree("SENIOR", { genus: "Platanus" });
			await page.goto(`/map?treeId=${tree.id}`);

			await page.getByRole("button", { name: "Tree profile" }).click();
			await expect(
				page.getByText("Plane trees are deciduous trees"),
			).toBeVisible();
			await page.getByRole("button", { name: "Tree profile" }).click();
			await expect(
				page.getByText("Plane trees are deciduous trees"),
			).not.toBeVisible();
		},
	);
});
