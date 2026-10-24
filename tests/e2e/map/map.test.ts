import { expect, Page } from "@playwright/test";
import { councils } from "../../../src/config/councils";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import {
	councilTrees,
	edgeTrees,
	findTree,
	IN_SEASON_DATE,
	IN_SEASON_NOW,
	metresBetween,
	readTreeState,
} from "../trees";
import { OPEN_METEO_URL } from "../weather";

// The style is served locally, so the map "loads" without a Mapbox request.
testWithoutSplashScreen.use({ mapMode: "stubbed" });

const treeCount = async (page: Page) =>
	Number(await page.getByTestId("map").getAttribute("data-tree-count"));

/** The councils whose trees are on the map, in the order of councils.ts. */
const loadedCouncils = (page: Page) =>
	page.evaluate(() => {
		const store = (
			window as unknown as {
				__treesLayer: {
					getState: () => {
						data: {
							features: Array<{ properties: { council: string } }>;
						};
					};
				};
			}
		).__treesLayer.getState();
		return [...new Set(store.data.features.map((f) => f.properties.council))];
	});

const mapCentre = (page: Page) =>
	page.evaluate(
		() =>
			(
				window as unknown as {
					__map: { getCenter: () => { toArray: () => [number, number] } };
				}
			).__map
				.getCenter()
				.toArray() as [number, number],
	);

const councilButton = (page: Page, name: string) =>
	page.getByTestId("council-picker").getByRole("button", { name, exact: true });

testWithoutSplashScreen.describe("Map", () => {
	testWithoutSplashScreen(
		"should start with the City of Perth's trees only",
		async ({ page }) => {
			await page.goto("/map");

			await expect
				.poll(() => treeCount(page), { timeout: 20_000 })
				.toBe(councilTrees("perth").length);
			expect(await loadedCouncils(page)).toEqual(["perth"]);
			await expect(councilButton(page, "Perth")).toHaveAttribute(
				"aria-pressed",
				"true",
			);
		},
	);

	testWithoutSplashScreen(
		"should go to a council and load its trees when it is picked",
		async ({ page }) => {
			await page.goto("/map");
			await expect
				.poll(() => treeCount(page), { timeout: 20_000 })
				.toBe(councilTrees("perth").length);

			await councilButton(page, "Fremantle").click();

			await expect(councilButton(page, "Fremantle")).toHaveAttribute(
				"aria-pressed",
				"true",
			);
			await expect(councilButton(page, "Perth")).toHaveAttribute(
				"aria-pressed",
				"false",
			);
			await expect
				.poll(() => loadedCouncils(page), { timeout: 20_000 })
				.toEqual(["perth", "fremantle"]);
			await expect
				.poll(async () =>
					metresBetween(await mapCentre(page), councils.fremantle.centre),
				)
				.toBeLessThan(10);
		},
	);

	testWithoutSplashScreen(
		"should load a council's trees when the map is moved there",
		async ({ page }) => {
			await page.goto("/map");
			await expect
				.poll(() => treeCount(page), { timeout: 20_000 })
				.toBe(councilTrees("perth").length);

			await page.evaluate((centre) => {
				(
					window as unknown as {
						__map: { jumpTo: (options: { center: [number, number] }) => void };
					}
				).__map.jumpTo({ center: centre });
			}, councils.bassendean.centre);

			await expect
				.poll(() => loadedCouncils(page), { timeout: 20_000 })
				.toEqual(["perth", "bassendean"]);
			await expect(councilButton(page, "Bassendean")).toHaveAttribute(
				"aria-pressed",
				"true",
			);
		},
	);

	testWithoutSplashScreen(
		"should start with the trees of the council a link points at",
		async ({ page }) => {
			const [lng, lat] = councils.fremantle.centre;
			await page.goto(`/map?lat=${lat}&lng=${lng}&zoom=15`);

			await expect
				.poll(() => treeCount(page), { timeout: 20_000 })
				.toBe(councilTrees("fremantle").length);
			expect(await loadedCouncils(page)).toEqual(["fremantle"]);
		},
	);

	testWithoutSplashScreen(
		"should say when a council's trees cannot be loaded, and try again when it is picked",
		async ({ page }) => {
			const bassendeanTrees = "**/data/trees/bassendean.geojson";
			await page.route(bassendeanTrees, (route) =>
				route.fulfill({ status: 503 }),
			);
			await page.goto("/map");
			await expect
				.poll(() => treeCount(page), { timeout: 20_000 })
				.toBe(councilTrees("perth").length);

			await councilButton(page, "Bassendean").click();

			await expect(
				page.getByText(
					"The trees of the Town of Bassendean could not be loaded. Please check your connection and try again.",
				),
			).toBeVisible();
			expect(await loadedCouncils(page)).toEqual(["perth"]);

			await page.unroute(bassendeanTrees);
			await councilButton(page, "Bassendean").click();
			await expect
				.poll(() => loadedCouncils(page), { timeout: 20_000 })
				.toEqual(["perth", "bassendean"]);
		},
	);

	testWithoutSplashScreen(
		"should reach the trees at the edges of the councils' area",
		async ({ page }) => {
			for (const {
				coordinates: [lng, lat],
			} of edgeTrees()) {
				await page.goto(`/map?lat=${lat}&lng=${lng}&zoom=17`);
				await expect(page.getByTestId("map")).not.toHaveAttribute(
					"data-tree-count",
					"0",
				);
				// Not held back by the map's bounds
				const centre = await page.evaluate(() =>
					(
						window as unknown as {
							__map: { getCenter: () => { lng: number; lat: number } };
						}
					).__map.getCenter(),
				);
				expect(centre.lng).toBeCloseTo(lng, 3);
				expect(centre.lat).toBeCloseTo(lat, 3);
			}
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

	// Re-colouring when the rain arrives late is covered by the store's unit test.
	testWithoutSplashScreen(
		"should draw the trees while the weather service does not answer",
		async ({ page }) => {
			const tree = findTree("JUNIOR", { now: IN_SEASON_NOW });
			// Never answered: the app gives up on its own after a while.
			await page.route(OPEN_METEO_URL, () => {});

			await page.goto(`/map?now=${IN_SEASON_DATE}`);

			await expect
				.poll(() => readTreeState(page, tree.id))
				.toMatchObject({ need: "THIRSTY" });
			await expect(page.getByTestId("map")).not.toHaveAttribute(
				"data-tree-count",
				"0",
			);
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
