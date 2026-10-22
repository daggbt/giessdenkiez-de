import { useAuthStore } from "../../../auth/auth-store";
import { useErrorStore } from "../../../error/error-store";
import { useI18nStore } from "../../../i18n/i18n-store";
import { useTreeStore } from "../stores/tree-store";
import { useProfileStore } from "../../../shared-stores/profile-store";
import { supabaseClient } from "../../../auth/supabase-client";
import { useTreesLayerStore } from "../../map/trees-layer-store";

export interface WaterTreeState {
	/** Resolves once the watering is saved; throws when it was not. */
	waterTree: (amount: number, date: Date) => Promise<void>;
	deleteWatering: (wateringId: number) => Promise<void>;
}

/**
 * Brings the tree's waterings, the profile and the map up to date. The change
 * is already saved when this runs, so a failure only means the screen is out
 * of date, and is reported as that.
 */
async function refreshAfterChange(treeId: string) {
	const results = await Promise.allSettled([
		useProfileStore.getState().refreshUserWaterings(),
		useTreeStore
			.getState()
			.refreshTreeWateringData(treeId, new AbortController()),
		useTreesLayerStore.getState().refresh(),
	]);

	const failure = results.find((result) => result.status === "rejected");
	if (failure) {
		useErrorStore
			.getState()
			.handleError(
				useI18nStore.getState().i18n().treeDetail.waterNeed
					.savedButNotRefreshed,
				failure.reason,
			);
	}
}

export function useWaterTree(): WaterTreeState {
	const i18n = useI18nStore().i18n();
	const handleError = useErrorStore().handleError;

	const waterTree = async (amount: number, date: Date) => {
		// Read at call time: the dialog can outlive the render it was created in.
		const userId = useAuthStore.getState().session?.user.id;
		const treeId = useTreeStore.getState().selectedTreeId;

		if (!userId || !treeId) {
			throw new Error("Watering needs a logged-in user and a selected tree");
		}

		const { error } = await supabaseClient.from("trees_watered").insert({
			amount: amount,
			tree_id: treeId,
			uuid: userId,
			timestamp: date.toISOString(),
		});

		if (error) {
			throw error;
		}

		await refreshAfterChange(treeId);
	};

	const deleteWatering = async (wateringId: number) => {
		const treeId = useTreeStore.getState().selectedTreeId;

		if (!useAuthStore.getState().session?.user.id || !treeId) {
			return;
		}

		try {
			const { error } = await supabaseClient
				.from("trees_watered")
				.delete()
				.eq("id", wateringId);

			if (error) {
				throw error;
			}
		} catch (error) {
			handleError(i18n.common.defaultErrorMessage, error);
			return;
		}

		await refreshAfterChange(treeId);
	};

	return {
		waterTree,
		deleteWatering,
	};
}
