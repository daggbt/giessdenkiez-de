import { create } from "zustand";
import { useAuthStore } from "../../../auth/auth-store";
import { useErrorStore } from "../../../error/error-store";
import { useI18nStore } from "../../../i18n/i18n-store";
import { useProfileStore } from "../../../shared-stores/profile-store";
import { supabaseClient } from "../../../auth/supabase-client";
import { useTreesLayerStore } from "../../map/trees-layer-store";

interface TreeAdoptStore {
	/** True while an adoption, or its removal, is saved and shown. */
	isLoading: boolean;
	adoptTree: (treeId: string) => Promise<void>;
	unadoptTree: (treeId: string) => Promise<void>;
}

const { handleError } = useErrorStore.getState();
const i18n = useI18nStore.getState().i18n();

export const useTreeAdoptStore = create<TreeAdoptStore>()((set, get) => {
	/**
	 * Saves the change, then updates the profile's adopted trees and the map's
	 * adoption counts. Taps in the meantime are ignored: a second one would
	 * adopt the tree twice or undo the first.
	 */
	const changeAdoption = async (
		save: (userId: string) => PromiseLike<{ error: unknown }>,
	) => {
		const userId = useAuthStore.getState().session?.user.id;
		if (!userId || get().isLoading) {
			return;
		}

		set({ isLoading: true });
		try {
			const { error } = await save(userId);
			if (error) {
				throw error;
			}
		} catch (error) {
			handleError(i18n.treeDetail.adoptErrorMessage, error);
			set({ isLoading: false });
			return;
		}

		try {
			await Promise.all([
				useProfileStore.getState().refreshAdoptedTreesInfo(),
				useTreesLayerStore.getState().refresh(),
			]);
		} catch (error) {
			handleError(i18n.common.savedButNotRefreshed, error);
		} finally {
			set({ isLoading: false });
		}
	};

	return {
		isLoading: false,
		adoptTree: (treeId) =>
			changeAdoption((userId) =>
				supabaseClient
					.from("trees_adopted")
					.insert({ uuid: userId, tree_id: treeId }),
			),
		unadoptTree: (treeId) =>
			changeAdoption((userId) =>
				supabaseClient
					.from("trees_adopted")
					.delete()
					.eq("uuid", userId)
					.eq("tree_id", treeId),
			),
	};
});
