import { expect, Page } from "@playwright/test";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import { findTree, treeCoordinates } from "../trees";

// The style is served locally, so the map "loads" without a Mapbox request.
testWithoutSplashScreen.use({ mapMode: "stubbed" });

const waitForTrees = (page: Page) =>
	expect(page.getByTestId("map")).not.toHaveAttribute("data-tree-count", "0");

/** Waits until the map draws a tree right in its centre, so a click there hits it. */
const waitForTreeAtCentre = (page: Page) =>
	page.waitForFunction(() => {
		const map = (
			window as unknown as {
				__map?: {
					getLayer: (id: string) => unknown;
					getContainer: () => HTMLElement;
					queryRenderedFeatures: (
						point: [number, number],
						options: { layers: string[] },
					) => unknown[];
				};
			}
		).__map;
		if (!map?.getLayer("trees")) {
			return false;
		}
		const { clientWidth, clientHeight } = map.getContainer();
		return (
			map.queryRenderedFeatures([clientWidth / 2, clientHeight / 2], {
				layers: ["trees"],
			}).length > 0
		);
	});

/** Opens the map centred on a tree, close enough to hit it with a click. */
const atTree = (path: string) => {
	const [lng, lat] = treeCoordinates(findTree("SENIOR").id);
	return `${path}?lat=${lat}&lng=${lng}&zoom=19`;
};

async function clickMapCentre(page: Page) {
	const box = await page.getByTestId("map").boundingBox();
	await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

testWithoutSplashScreen.describe("Map navigation", () => {
	testWithoutSplashScreen(
		"should follow the map in the URL without a history entry per move",
		async ({ page, isMobile }) => {
			testWithoutSplashScreen.skip(isMobile, "drags the map with a mouse");
			await page.goto("/map");
			await waitForTrees(page);
			const historyLength = await page.evaluate(() => history.length);
			const lngBefore = new URL(page.url()).searchParams.get("lng");

			const box = await page.getByTestId("map").boundingBox();
			for (let pan = 0; pan < 3; pan++) {
				await page.mouse.move(box!.x + 600, box!.y + 400);
				await page.mouse.down();
				await page.mouse.move(box!.x + 500, box!.y + 350, { steps: 5 });
				await page.mouse.up();
			}

			await expect
				.poll(() => new URL(page.url()).searchParams.get("lng"))
				.not.toBe(lngBefore);
			expect(await page.evaluate(() => history.length)).toBe(historyLength);
		},
	);

	testWithoutSplashScreen(
		"should go back from the profile to the map",
		async ({ page }) => {
			await page.goto("/map");
			await waitForTrees(page);

			await page.getByRole("link", { name: "Profile" }).click();
			await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
			const historyLength = await page.evaluate(() => history.length);

			await page.goBack();
			await expect(page).toHaveURL(/\/map\?/);
			await expect(page.getByRole("heading", { name: "Login" })).toBeHidden();
			expect(await page.evaluate(() => history.length)).toBe(historyLength);

			await page.goForward();
			await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should close an opened tree with Back",
		async ({ page }) => {
			await page.goto(atTree("/map"));
			await waitForTreeAtCentre(page);

			await clickMapCentre(page);
			await expect(page.getByTestId("tree-status")).toBeVisible();
			await expect(page).toHaveURL(/treeId=/);

			await page.goBack();
			await expect(page.getByTestId("tree-status")).toBeHidden();
			expect(new URL(page.url()).searchParams.get("treeId")).toBeNull();

			await page.goForward();
			await expect(page.getByTestId("tree-status")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should open a tree with the first click after starting on another page",
		async ({ page }) => {
			await page.goto(atTree("/about"));
			// Loaded under the information page, as for a visitor reading it first.
			await waitForTreeAtCentre(page);

			await page.getByRole("link", { name: "Map", exact: true }).click();
			await clickMapCentre(page);

			await expect(page.getByTestId("tree-status")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should ignore unusable coordinates in a link",
		async ({ page }) => {
			await page.goto("/map?lat=abc&lng=115.85&zoom=NaN");
			await waitForTrees(page);

			// Replaced by the default view, not written back as NaN.
			await expect
				.poll(() => {
					const params = new URL(page.url()).searchParams;
					return [params.get("lat"), params.get("zoom")].map((value) =>
						Number.isFinite(Number(value)),
					);
				})
				.toEqual([true, true]);
		},
	);
});

testWithoutSplashScreen.describe("Address search", () => {
	const hayStreet = {
		type: "FeatureCollection",
		features: [
			{
				id: "address.1",
				place_name: "Hay Street, Perth Western Australia 6000, Australia",
				geometry: { type: "Point", coordinates: [115.8575, -31.9535] },
			},
		],
	};

	testWithoutSplashScreen(
		"should ask Mapbox once per pause in typing and pick a result with Enter",
		async ({ page }) => {
			const searches: string[] = [];
			await page.route("**/geocoding/v5/**", (route) => {
				searches.push(new URL(route.request().url()).pathname);
				return route.fulfill({ json: hayStreet });
			});

			await page.goto("/map");
			await waitForTrees(page);

			const search = page.getByPlaceholder("Search for an address");
			await search.pressSequentially("Hay St", { delay: 50 });
			await expect(
				page.getByRole("button", { name: /^Hay Street, Perth/ }),
			).toBeVisible();
			expect(searches).toHaveLength(1);

			await search.press("Enter");
			await expect(search).toHaveValue(hayStreet.features[0].place_name);
			await expect(
				page.getByRole("button", { name: /^Hay Street, Perth/ }),
			).toBeHidden();
		},
	);

	testWithoutSplashScreen(
		"should leave Enter outside the search box alone",
		async ({ page }) => {
			await page.goto("/map");
			await waitForTrees(page);

			// Used to throw: the search box answered Enter anywhere on the page.
			await page.getByRole("link", { name: "Map", exact: true }).focus();
			await page.keyboard.press("Enter");
			await expect(page.getByTestId("map")).toBeVisible();
		},
	);
});
