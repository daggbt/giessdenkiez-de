import { beforeEach, describe, expect, test, vi } from "vitest";
import type { TreeWateringData } from "../../src/components/tree-detail/tree-types";

const answers = new Map<string, Promise<unknown>>();

// Stands in for `rpc(...).select(...).order(...).abortSignal(...)`.
vi.mock("../../src/auth/supabase-client", () => ({
	supabaseClient: {
		rpc: (_name: string, { t_id }: { t_id: string }) => {
			const query = {
				select: () => query,
				order: () => query,
				abortSignal: () => answers.get(t_id),
			};
			return query;
		},
	},
}));

const watering = (id: number, treeId: string): TreeWateringData => ({
	id,
	tree_id: treeId,
	amount: 20,
	timestamp: "2027-01-15T02:00:00Z",
	username: "someone",
});

describe("tree store", () => {
	beforeEach(() => {
		vi.resetModules();
		answers.clear();
	});

	test("a refresh that ends after another tree was opened leaves its panel alone", async () => {
		const { useTreeStore } =
			await import("../../src/components/tree-detail/stores/tree-store");
		const { setSelectedTreeId, refreshTreeWateringData } =
			useTreeStore.getState();

		// Tree A was watered; its waterings are reloaded slowly ...
		let answerA: (value: unknown) => void = () => {};
		answers.set("A", new Promise((resolve) => (answerA = resolve)));
		setSelectedTreeId("A");
		const refreshOfA = refreshTreeWateringData("A", new AbortController());

		// ... while tree B is opened and shows its own waterings.
		answers.set(
			"B",
			Promise.resolve({ data: [watering(2, "B")], error: null }),
		);
		setSelectedTreeId("B");
		await refreshTreeWateringData("B", new AbortController());

		answerA({ data: [watering(1, "A")], error: null });
		await refreshOfA;

		expect(useTreeStore.getState().treeWateringData).toEqual([
			watering(2, "B"),
		]);
	});
});
