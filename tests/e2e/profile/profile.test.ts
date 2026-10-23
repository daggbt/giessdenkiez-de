import { expect } from "@playwright/test";
import { testWithLoggedInUser } from "../fixtures/test-with-logged-in-user";
import { testWithAdoptedTree } from "../fixtures/test-with-adopted-tree";
import { waterTree } from "../fixtures/tree-data";
import { findTree } from "../trees";

testWithLoggedInUser.describe("Profile of a logged-in user", () => {
	testWithLoggedInUser(
		"should show the profile with an empty overview",
		async ({ page, account }) => {
			await page.goto("/profile");

			await expect(
				page.getByRole("heading", { name: "Your profile" }),
			).toBeVisible();
			await expect(page.getByText(account.username)).toBeVisible();
			await expect(page.getByText(account.email)).toBeVisible();
			await expect(
				page.getByText("If you regularly water a tree, you can adopt it."),
			).toBeVisible();
		},
	);

	testWithLoggedInUser(
		"should count the waterings of the user",
		async ({ page, account }) => {
			await waterTree({ account, treeId: findTree("SENIOR").id, amount: 12 });

			await page.goto("/profile");

			// The overview tiles have no test ids, so scope by the tile's label.
			const literTile = page
				.locator("div")
				.filter({ hasText: /^Litres\d+$/ })
				.first();
			await expect(literTile).toContainText("12");
		},
	);
});

testWithAdoptedTree.describe("Profile with an adopted tree", () => {
	testWithAdoptedTree(
		"should list the adopted tree",
		async ({ page, adoptedTreeId }) => {
			await page.goto("/profile");

			const treeLink = page.getByRole("link", {
				name: findTree("JUNIOR").common_name ?? "",
			});
			await expect(treeLink).toBeVisible();
			expect(await treeLink.getAttribute("href")).toBe(
				`/map?treeId=${adoptedTreeId}&zoom=18`,
			);
		},
	);
});
