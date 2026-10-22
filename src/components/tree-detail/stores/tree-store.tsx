import { create } from "zustand";
import { TreeCoreData, TreeWateringData } from "../tree-types";
import { useTreeAdoptStore } from "./adopt-tree-store";
import { supabaseClient } from "../../../auth/supabase-client";

const TREE_CORE_COLUMNS = [
	"id",
	"botanical_name",
	"common_name",
	"family",
	"genus",
	"planted_date",
	"planted_date_precision",
	"suburb",
	"height_m",
	"is_rare",
	"is_heritage",
	"is_significant",
	"is_significant_group",
	"lat",
	"lng",
].join(", ");

interface TreeStore {
	refreshTreeData: (
		treeId: string | undefined,
		abortController: AbortController,
	) => Promise<void>;

	treeCoreData: TreeCoreData | undefined;
	setTreeCoreData: (treeData: TreeCoreData | undefined) => void;
	refreshTreeCoreData: (
		treeId: string | undefined,
		abortController: AbortController,
	) => Promise<void>;

	treeWateringData: TreeWateringData[];
	setTreeWateringData: (treeWateringData: TreeWateringData[]) => void;
	refreshTreeWateringData: (
		treeId: string | undefined,
		abortController: AbortController,
	) => Promise<void>;

	selectedTreeId: string | undefined;
	setSelectedTreeId: (selectedTreeId: string | undefined) => void;

	hoveredTreeId: string | undefined;
	setHoveredTreeId: (hoveredTreeId: string | undefined) => void;
	isWateringLoading: boolean;
	setIsWateringLoading: (isWateringLoading: boolean) => void;
	isLastWateringsExpanded: boolean;
	setIsLastWateringsExpanded: (isExpanded: boolean) => void;
}

export const useTreeStore = create<TreeStore>()((set, get) => ({
	refreshTreeData: async (treeId, abortController) => {
		const promises = [
			get().refreshTreeCoreData(treeId, abortController),
			get().refreshTreeWateringData(treeId, abortController),
			useTreeAdoptStore
				.getState()
				.refreshIsTreeAdoptedByOthers(treeId, abortController),
		];

		await Promise.all(promises);
	},

	treeCoreData: undefined,
	setTreeCoreData: (treeCoreData) => {
		set({ treeCoreData });
	},
	refreshTreeCoreData: async (treeId, abortController) => {
		get().setTreeCoreData(undefined);

		if (!treeId) {
			return;
		}

		const { data, error } = await supabaseClient
			.from("trees")
			.select(TREE_CORE_COLUMNS)
			.eq("id", treeId)
			.abortSignal(abortController.signal);

		if (error) {
			throw new Error("Failed to fetch tree core data");
		}

		const treeCoreData = data[0] as unknown as TreeCoreData | undefined;
		get().setTreeCoreData(treeCoreData);
	},

	treeWateringData: [],
	setTreeWateringData: (treeWateringData) => {
		set({ treeWateringData });
	},
	refreshTreeWateringData: async (treeId, abortController) => {
		get().setTreeWateringData([]);

		if (!treeId) {
			return;
		}
		const { data, error } = await supabaseClient
			.rpc("waterings_for_tree", { t_id: treeId })
			.select("*")
			.order("id", { ascending: false })
			.abortSignal(abortController.signal);

		if (error) {
			throw new Error("Failed to fetch tree watering data");
		}

		const treeWateringData: TreeWateringData[] = data;
		// Workaround to sort the data by id, because timestamps do not have a time value set
		// e.g. 2024-04-25 00:00:00+00
		const sortedTreeWateringData = treeWateringData.sort((a, b) => b.id - a.id);
		get().setTreeWateringData(sortedTreeWateringData);
	},

	selectedTreeId: undefined,
	setSelectedTreeId: (selectedTreeId) => {
		set({ selectedTreeId });
	},

	hoveredTreeId: undefined,
	setHoveredTreeId: (hoveredTreeId) => {
		set({ hoveredTreeId });
	},
	isLastWateringsExpanded: false,
	setIsLastWateringsExpanded: (isLastWateringsExpanded) => {
		set({ isLastWateringsExpanded });
	},
	isWateringLoading: false,
	setIsWateringLoading: (isWateringLoading) => {
		set({ isWateringLoading });
	},
}));
