import { findTree } from "../trees";
import { testWithLoggedInUser } from "./test-with-logged-in-user";
import { adoptTree } from "./tree-data";

type TestWithAdoptedTree = {
	adoptedTreeId: string;
};

/**
 * A logged-in user who has already adopted a tree, seeded via the database.
 */
export const testWithAdoptedTree =
	testWithLoggedInUser.extend<TestWithAdoptedTree>({
		adoptedTreeId: [
			async ({ account }, use) => {
				const treeId = findTree("JUNIOR").id;
				await adoptTree({ account, treeId });
				// The adoption is removed with the account in the registered-user
				// fixture's cleanup.
				await use(treeId);
			},
			{ scope: "test" },
		],
	});
