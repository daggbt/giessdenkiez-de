import { create } from "zustand";
import { useAuthStore } from "../../../auth/auth-store";
import { useErrorStore } from "../../../error/error-store";
import { useI18nStore } from "../../../i18n/i18n-store";
import { useProfileStore } from "../../../shared-stores/profile-store";
import { supabaseClient } from "../../../auth/supabase-client";
import { useTreesLayerStore } from "../../map/trees-layer-store";

interface TreeAdoptStore {
	isLoading: boolean;
	isAdopted: (treeId: string) => boolean;
	amountOfAdoptions: number;
	adoptTree: (treeId: string) => Promise<void>;
	unadoptTree: (treeId: string) => Promise<void>;
	refreshIsTreeAdoptedByOthers: (
		treeId: string | undefined,
		abortController: AbortController,
	) => Promise<void>;
}

const { refreshAdoptedTreesInfo } = useProfileStore.getState();
const { handleError } = useErrorStore.getState();
const i18n = useI18nStore.getState().i18n();

export const useTreeAdoptStore = create<TreeAdoptStore>()((set, get) => ({
	isLoading: false,
	isAdopted: (treeId) => {
		return useProfileStore.getState().adoptedTrees.includes(treeId);
	},
	amountOfAdoptions: 0,
	adoptTree: async (treeId) => {
		const abortController = new AbortController();
		const user = useAuthStore.getState().session?.user;

		if (!user?.id) {
			return;
		}
		try {
			set({ isLoading: true });

			const { error } = await supabaseClient
				.from("trees_adopted")
				.insert({ uuid: user?.id, tree_id: treeId });

			if (error) {
				set({ isLoading: false });
				handleError(i18n.treeDetail.adoptErrorMessage);
				return;
			}

			set({ isLoading: false });
			await refreshAdoptedTreesInfo();
			await useTreesLayerStore.getState().refresh();
			await get().refreshIsTreeAdoptedByOthers(treeId, abortController);
		} catch (error) {
			set({ isLoading: false });
			handleError(i18n.treeDetail.adoptErrorMessage, error);
		}
	},
	unadoptTree: async (treeId) => {
		const abortController = new AbortController();
		const user = useAuthStore.getState().session?.user;

		if (!user?.id) {
			return;
		}
		try {
			set({ isLoading: true });

			const { error } = await supabaseClient
				.from("trees_adopted")
				.delete()
				.eq("uuid", user?.id)
				.eq("tree_id", treeId);

			if (error) {
				set({ isLoading: false });
				handleError(i18n.treeDetail.adoptErrorMessage);
				return;
			}
			set({ isLoading: false });
			await refreshAdoptedTreesInfo();
			await useTreesLayerStore.getState().refresh();
			await get().refreshIsTreeAdoptedByOthers(treeId, abortController);
		} catch (error) {
			set({ isLoading: false });
			handleError(i18n.treeDetail.adoptErrorMessage, error);
		}
	},

	refreshIsTreeAdoptedByOthers: async (treeId, abortController) => {
		set({ amountOfAdoptions: 0 });

		if (!treeId) {
			return;
		}

		try {
			// The adoption counts come with the map's activity data.
			await useTreesLayerStore.getState().load();
			if (abortController.signal.aborted) {
				return;
			}

			const activity = useTreesLayerStore.getState().activityById[treeId];
			set({ amountOfAdoptions: activity?.adopted_count ?? 0 });
		} catch (error) {
			if (abortController.signal.aborted) {
				return;
			}

			handleError(i18n.common.defaultErrorMessage, error);
		}
	},
}));
