import { expect } from "@playwright/test";
import { testWithLoggedInUser } from "../fixtures/test-with-logged-in-user";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import {
	findTree,
	IN_SEASON_DATE,
	IN_SEASON_NOW,
	readTreeState,
} from "../trees";

// The tree detail panel waits for the map's `load` event.
testWithLoggedInUser.use({ mapMode: "stubbed" });

testWithLoggedInUser.describe("Watering a tree", () => {
	testWithLoggedInUser(
		"should record a watering, change the tree's status and count it on the profile",
		async ({ page, account }) => {
			// A tree that needs help in January 2027
			const tree = findTree("JUNIOR", { now: IN_SEASON_NOW });
			await page.goto(`/map?now=${IN_SEASON_DATE}&treeId=${tree.id}`);

			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ need: "THIRSTY" });

			await page.getByTestId("water-tree-button").click();
			await page.getByRole("spinbutton").fill("50");
			await page.getByRole("button", { name: "Save" }).click();

			// The watering shows up in the tree's own list ...
			await expect(page.getByText(account.username)).toBeVisible();
			await expect(page.getByText("50 L", { exact: true })).toBeVisible();

			// ... the tree is no longer "thirsty" but still short of its target ...
			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ need: "PARTIAL", watered_30d_l: 50 });
			await expect(page.getByTestId("tree-status")).toHaveText(
				"Watered recently, but still needs about 350 litres",
			);

			// ... and watering it up to the target turns it green.
			await page.getByTestId("water-tree-button").click();
			await page.getByRole("spinbutton").fill("350");
			await page.getByRole("button", { name: "Save" }).click();
			await expect(page.getByText("350 L", { exact: true })).toBeVisible();
			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ need: "SATISFIED" });
			await expect(page.getByTestId("tree-status")).toHaveText(
				"Well watered for now",
			);

			// Deleting the large watering takes it back.
			await page.getByTestId("delete-watering-button").first().click();
			await page.getByRole("button", { name: "Delete" }).click();
			await expect(page.getByText("350 L", { exact: true })).toBeHidden();
			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ need: "PARTIAL" });

			// The profile totals only count what is left.
			await page.getByRole("link", { name: "Profile" }).click();
			await expect(
				page
					.locator("div")
					.filter({ hasText: /^Litres\d+$/ })
					.first(),
			).toContainText("50");
		},
	);

	testWithLoggedInUser(
		"should keep the entry and say so when the watering is not saved",
		async ({ page }) => {
			const tree = findTree("JUNIOR", { now: IN_SEASON_NOW });
			await page.goto(`/map?now=${IN_SEASON_DATE}&treeId=${tree.id}`);

			// The connection drops while the watering is sent.
			await page.route("**/rest/v1/trees_watered*", (route) =>
				route.request().method() === "POST"
					? route.abort("internetdisconnected")
					: route.fallback(),
			);

			await page.getByTestId("water-tree-button").click();
			await page.getByRole("spinbutton").fill("30");
			await page.getByRole("button", { name: "Save" }).click();

			await expect(page.getByRole("alert")).toContainText("could not be saved");
			await expect(page.getByRole("spinbutton")).toHaveValue("30");
			await expect(
				page.getByText("Your watering entry was successful!"),
			).toBeHidden();

			// Back online, the same entry can be sent again.
			await page.unroute("**/rest/v1/trees_watered*");
			await page.getByRole("button", { name: "Save" }).click();

			await expect(
				page.getByText("Your watering entry was successful!"),
			).toBeVisible();
			await expect(page.getByText("30 L", { exact: true })).toBeVisible();
			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ need: "PARTIAL", watered_30d_l: 30 });
		},
	);

	testWithLoggedInUser(
		"should report a saved watering that cannot be shown yet",
		async ({ page }) => {
			const tree = findTree("JUNIOR", { now: IN_SEASON_NOW });
			const panelWaterings = page.waitForResponse(
				"**/rest/v1/rpc/waterings_for_tree*",
			);
			await page.goto(`/map?now=${IN_SEASON_DATE}&treeId=${tree.id}`);
			await panelWaterings;

			// The watering is saved, but reloading the tree's waterings fails.
			await page.route("**/rest/v1/rpc/waterings_for_tree*", (route) =>
				route.abort("internetdisconnected"),
			);

			await page.getByTestId("water-tree-button").click();
			await page.getByRole("spinbutton").fill("20");
			await page.getByRole("button", { name: "Save" }).click();

			await expect(
				page.getByText("Your watering entry was successful!"),
			).toBeVisible();
			await expect(
				page.getByText("saved, but the screen could not be updated"),
			).toBeVisible();
			// The map is updated from its own data.
			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ watered_30d_l: 20 });
		},
	);

	testWithLoggedInUser(
		"should not accept more than the maximum amount",
		async ({ page }) => {
			const tree = findTree("SENIOR");
			await page.goto(`/map?treeId=${tree.id}`);

			await page.getByTestId("water-tree-button").click();
			await page.getByRole("spinbutton").fill("1001");
			await page.getByRole("button", { name: "Save" }).click();

			await expect(page.getByRole("spinbutton")).toBeVisible();
			await expect(page.getByRole("spinbutton")).toHaveJSProperty(
				"validity.rangeOverflow",
				true,
			);
		},
	);

	testWithLoggedInUser(
		"should keep the button disabled for trees the City waters",
		async ({ page }) => {
			const tree = findTree("BABY");
			await page.goto(`/map?treeId=${tree.id}`);

			await expect(page.getByTestId("water-tree-button")).toBeDisabled();
		},
	);
});

testWithoutSplashScreen.describe("Watering a tree - logged out", () => {
	testWithoutSplashScreen.use({ mapMode: "stubbed" });

	testWithoutSplashScreen(
		"should point visitors at the login instead",
		async ({ page }) => {
			const tree = findTree("SENIOR");
			await page.goto(`/map?treeId=${tree.id}`);

			await expect(page.getByTestId("water-tree-button")).toBeDisabled();

			const loginLink = page.getByRole("link", {
				name: "Log-in",
				exact: true,
			});
			await expect(loginLink).toBeVisible();
			expect(await loginLink.getAttribute("href")).toContain(
				`redirectTo=/map?treeId=${tree.id}`,
			);
		},
	);
});
