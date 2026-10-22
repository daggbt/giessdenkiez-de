import { expect } from "@playwright/test";
import { testWithLoggedInUser } from "../fixtures/test-with-logged-in-user";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import { findTree, readTreeState } from "../trees";

// The tree detail panel waits for the map's `load` event.
testWithLoggedInUser.use({ mapMode: "stubbed" });

testWithLoggedInUser.describe("Adopting a tree", () => {
	testWithLoggedInUser(
		"should adopt a tree and list it on the profile",
		async ({ page }) => {
			const tree = findTree("SENIOR");
			await page.goto(`/map?treeId=${tree.id}`);
			await expect(page.getByText("Adopt this tree")).toBeVisible();

			await page.getByTestId("adopt-button").click();
			await expect(page.getByText("You have adopted this tree")).toBeVisible();

			// The map knows about the adoption without a reload.
			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ adopted: true });

			await page.getByRole("link", { name: "Profile" }).click();
			await expect(
				page.getByRole("link", { name: tree.common_name ?? "" }),
			).toBeVisible();
		},
	);

	testWithLoggedInUser("should unadopt a tree again", async ({ page }) => {
		const tree = findTree("SENIOR");
		await page.goto(`/map?treeId=${tree.id}`);

		await page.getByTestId("adopt-button").click();
		await expect(page.getByText("You have adopted this tree")).toBeVisible();

		await page.getByTestId("adopt-button").click();
		await expect(page.getByText("Adopt this tree")).toBeVisible();
		await expect
			.poll(() => readTreeState(page, tree.id))
			.toMatchObject({ adopted: false });

		await page.getByRole("link", { name: "Profile" }).click();
		await expect(page.getByText("If you regularly water a tree")).toBeVisible();
	});
});

testWithoutSplashScreen.describe("Adopting a tree - logged out", () => {
	testWithoutSplashScreen.use({ mapMode: "stubbed" });

	testWithoutSplashScreen(
		"should point visitors at the login instead",
		async ({ page }) => {
			const tree = findTree("SENIOR");
			await page.goto(`/map?treeId=${tree.id}`);

			const loginLink = page.getByRole("link", {
				name: "Please log in first to adopt this tree",
			});
			await expect(loginLink).toBeVisible();
			expect(await loginLink.getAttribute("href")).toContain(
				`redirectTo=/map?treeId=${tree.id}`,
			);
		},
	);
});
