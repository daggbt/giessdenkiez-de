import { expect, Page } from "@playwright/test";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import {
	IN_SEASON_DATE,
	IN_SEASON_NOW,
	locateTrees,
	metresBetween,
	TreeLocation,
} from "../trees";

// The style is served locally, so the map "loads" without a Mapbox request.
testWithoutSplashScreen.use({ mapMode: "stubbed" });

// In the season, without waterings or rain, every young tree is thirsty.
const thirstyTrees = locateTrees("JUNIOR", IN_SEASON_NOW);

/** A tree with no thirsty tree in sight, even on a tilted map. */
const awayFromThirstyTrees = locateTrees("SENIOR", IN_SEASON_NOW).find((tree) =>
	thirstyTrees.every(
		(thirsty) => metresBetween(tree.coordinates, thirsty.coordinates) > 1200,
	),
)!;

const mapAt = (tree: TreeLocation, zoom: number) => {
	const [lng, lat] = tree.coordinates;
	return `/map?now=${IN_SEASON_DATE}&lat=${lat}&lng=${lng}&zoom=${zoom}`;
};

/** Answers the map's activity request: these trees were watered a little. */
async function stubWateredTrees(page: Page, trees: TreeLocation[]) {
	await page.route("**/rest/v1/rpc/tree_activity_30d*", (route) =>
		route.fulfill({
			json: Object.fromEntries(trees.map((tree) => [tree.id, [50, 1, 0]])),
		}),
	);
}

/** Waits until the trees are drawn and the map has stopped moving. */
const waitForMapAtRest = (page: Page) =>
	page.waitForFunction(() => {
		const map = (
			window as unknown as {
				__map?: { getLayer: (id: string) => unknown; isMoving: () => boolean };
			}
		).__map;
		return map?.getLayer("trees") !== undefined && !map.isMoving();
	});

/**
 * The ids of the given trees that can be seen: on the map, below the search
 * bar and the council buttons, and not behind the legend.
 */
const treesInView = (page: Page, trees: TreeLocation[]) =>
	page.evaluate((trees) => {
		const map = (
			window as unknown as {
				__map: {
					getContainer: () => HTMLElement;
					project: (lngLat: [number, number]) => { x: number; y: number };
				};
			}
		).__map;
		const { clientWidth, clientHeight } = map.getContainer();
		const legend = document
			.querySelector('[data-testid="legend"]')!
			.getBoundingClientRect();
		const searchBarBottom =
			document
				.querySelector('[data-testid="council-picker"]')
				?.getBoundingClientRect().bottom ?? 90;
		return trees
			.filter(({ coordinates }) => {
				const { x, y } = map.project(coordinates);
				const isBehindLegend =
					x >= legend.left &&
					x <= legend.right &&
					y >= legend.top &&
					y <= legend.bottom;
				return (
					x >= 0 &&
					x <= clientWidth &&
					y >= searchBarBottom &&
					y <= clientHeight &&
					!isBehindLegend
				);
			})
			.map(({ id }) => id);
	}, trees);

/** The line below the colours: a hint, or why a colour shows nothing. */
const legendNote = (page: Page) =>
	page.getByTestId("legend").getByRole("status");

const mapCentre = (page: Page) =>
	page.evaluate(() =>
		(
			window as unknown as {
				__map: { getCenter: () => { toArray: () => [number, number] } };
			}
		).__map
			.getCenter()
			.toArray(),
	);

testWithoutSplashScreen.describe("Map legend", () => {
	testWithoutSplashScreen(
		"should be open on the first visit only",
		async ({ page }) => {
			await page.goto("/map");

			await expect(page.getByText("Thirsty — needs water")).toBeVisible();
			// Nothing is greyed out without a filter.
			await expect(page.getByText("Filtered out")).toBeHidden();

			await page.reload();
			await expect(page.getByRole("button", { name: "Legend" })).toBeVisible();
			await expect(page.getByText("Thirsty — needs water")).toBeHidden();
		},
	);

	testWithoutSplashScreen(
		"should show where the trees of a colour are",
		async ({ page }) => {
			await stubWateredTrees(page, []);
			await page.goto(mapAt(awayFromThirstyTrees, 18));
			await waitForMapAtRest(page);
			expect(await treesInView(page, thirstyTrees)).toEqual([]);

			const thirsty = page.getByRole("button", {
				name: "Thirsty — needs water",
			});
			await thirsty.click();

			await expect(thirsty).toHaveAttribute("aria-pressed", "true");
			await expect(page.getByText("Filtered out")).toBeVisible();
			await expect(legendNote(page)).toHaveText(
				"Tap the colour again to see all trees.",
			);
			await waitForMapAtRest(page);
			expect((await treesInView(page, thirstyTrees)).length).toBeGreaterThan(0);

			// The colour stays picked while the legend is closed.
			const legendButton = page.getByRole("button", { name: "Legend" });
			await legendButton.click();
			await legendButton.click();
			await expect(thirsty).toHaveAttribute("aria-pressed", "true");

			await thirsty.click();
			await expect(thirsty).toHaveAttribute("aria-pressed", "false");
			await expect(page.getByText("Filtered out")).toBeHidden();
			await expect(legendNote(page)).toHaveText(
				"Tap a colour to see where those trees are.",
			);
		},
	);

	testWithoutSplashScreen(
		"should go to the nearest trees of a colour, and stay when they are in view",
		async ({ page }) => {
			// Two watered trees close together, and one far away.
			const [near] = thirstyTrees;
			const alsoNear = thirstyTrees.find((tree) => {
				const metres = metresBetween(tree.coordinates, near.coordinates);
				return metres > 50 && metres < 150;
			})!;
			const far = thirstyTrees.find(
				(tree) => metresBetween(tree.coordinates, near.coordinates) > 3000,
			)!;
			const start = locateTrees("SENIOR", IN_SEASON_NOW).find((tree) => {
				const metres = metresBetween(tree.coordinates, near.coordinates);
				return (
					metres > 1500 &&
					metres < 2500 &&
					metresBetween(tree.coordinates, far.coordinates) > metres + 1000
				);
			})!;
			const wateredTrees = [near, alsoNear, far];
			await stubWateredTrees(page, wateredTrees);

			await page.goto(mapAt(start, 18));
			await waitForMapAtRest(page);
			expect(await treesInView(page, wateredTrees)).toEqual([]);

			const watered = page.getByRole("button", {
				name: "Watered recently, needs more",
			});
			await watered.click();
			await waitForMapAtRest(page);
			expect((await treesInView(page, wateredTrees)).sort()).toEqual(
				[near.id, alsoNear.id].sort(),
			);

			// With the trees in view, though not in the middle, picking the colour
			// again leaves the map where it is.
			await watered.click();
			// Braces: panBy returns the map, which Playwright would copy out of the page.
			await page.evaluate(() => {
				(
					window as unknown as {
						__map: { panBy: (offset: [number, number]) => void };
					}
				).__map.panBy([20, 0]);
			});
			await waitForMapAtRest(page);
			expect(await treesInView(page, wateredTrees)).not.toEqual([]);
			const centre = await mapCentre(page);

			await watered.click();
			await waitForMapAtRest(page);
			expect(await mapCentre(page)).toEqual(centre);
		},
	);

	testWithoutSplashScreen(
		"should explain why no tree is thirsty outside the season",
		async ({ page }) => {
			await page.goto("/map?now=2026-10-22");
			await waitForMapAtRest(page);

			const thirsty = page.getByRole("button", {
				name: "Thirsty — needs water",
			});
			await thirsty.click();

			await expect(legendNote(page)).toHaveText(
				"The watering season runs November–April. Until then, all trees are green.",
			);
			await expect(thirsty).toHaveAttribute("aria-pressed", "false");
		},
	);

	testWithoutSplashScreen(
		"should say when the filters hide every tree of a colour",
		async ({ page }) => {
			// Nobody has adopted a tree, so the adopted-trees filter hides them all.
			await stubWateredTrees(page, []);
			await page.goto(
				`/map?now=${IN_SEASON_DATE}&areOnlyAllAdoptedTreesVisible=true`,
			);
			await waitForMapAtRest(page);

			await page.getByRole("button", { name: "Thirsty — needs water" }).click();

			await expect(legendNote(page)).toHaveText(
				"No trees of this colour match your filters.",
			);
		},
	);
});
