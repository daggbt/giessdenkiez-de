import { useEffect } from "react";
import { useUrlState } from "../store";
import { useTreeStore } from "../../tree-detail/stores/tree-store";

/** Follows the browser's Back and Forward buttons. */
export function useLocationEventListener() {
	useEffect(() => {
		const onPopState = () => {
			useUrlState.getState().syncWithBrowser();

			// Going back from an open tree closes it on the map too.
			const treeId = useUrlState.getState().url.searchParams.get("treeId");
			const { selectedTreeId, setSelectedTreeId, setTreeCoreData } =
				useTreeStore.getState();
			if (!treeId && selectedTreeId) {
				setTreeCoreData(undefined);
				setSelectedTreeId(undefined);
			}
		};

		window.addEventListener("popstate", onPopState);

		return () => {
			window.removeEventListener("popstate", onPopState);
		};
	}, []);
}
