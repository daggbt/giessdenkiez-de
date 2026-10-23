import React, { useEffect, useMemo } from "react";
import { CloseIcon } from "../icons/close-icon";
import { useUrlState } from "../router/store";
import { useFetchTreeData } from "./hooks/use-fetch-tree-data";
import { TreeAge } from "./tree-age";
import { TreeFacts } from "./tree-facts";
import { TreeAdoptCard } from "./tree-adopt-card";
import { useTreeStore } from "./stores/tree-store";
import { useI18nStore } from "../../i18n/i18n-store";
import { TreeWaterNeed } from "./tree-water-needs/tree-water-needs";
import { WaterTree } from "./tree-water-needs/water-tree/water-tree";
import { TreeStatus } from "./tree-status";
import { useTreeAgeClassification } from "./hooks/use-tree-age-classification";
import { LastWaterings } from "./last-waterings/last-waterings";
import { ProblemCard } from "./problem-card";
import { TreeFlier } from "./tree-flier";
import { Loading } from "../loading/loading";
import { TreeIcon } from "../icons/tree-icon";
import { useShallow } from "zustand/react/shallow";

export const TreeDetail: React.FC = () => {
	const i18n = useI18nStore().i18n();

	const [url, removeSearchParam] = useUrlState(
		useShallow((state) => [state.url, state.removeSearchParam]),
	);
	const { selectedTreeId, setSelectedTreeId, setHoveredTreeId } =
		useTreeStore();

	const treeId = url.searchParams.get("treeId");
	if (!treeId) {
		return null;
	}

	useEffect(() => {
		if (treeId && treeId !== selectedTreeId) {
			setSelectedTreeId(treeId);
		}
	}, [treeId]);

	const { setTreeCoreData, treeCoreData, treeWateringData } = useTreeStore();

	useFetchTreeData(treeId);

	const { treeAgeClassification } = useTreeAgeClassification(treeCoreData);
	const treeTypeInfo = useMemo(() => {
		return i18n.treeDetail.treeTypeInfos.find(
			(treeType) => treeType.id === treeCoreData?.genus,
		);
	}, [treeCoreData, i18n]);

	const onClose = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
		e.preventDefault();
		removeSearchParam("treeId", { isNewHistoryEntry: true });
		setTreeCoreData(undefined);
		setSelectedTreeId(undefined);
		/**
		 * We set the hovered tree id so users can see
		 * which was the tree they just closed
		 */
		setHoveredTreeId(treeId);
	};

	return (
		<div className="pointer-events-auto h-full bg-white rounded-l shadow-gdk-hard-up flex w-[100vw] flex-col gap-4 overflow-scroll p-5 lg:w-[400px] lg:min-w-[400px]">
			<a href="/map" className="flex flex-row justify-end" onClick={onClose}>
				<CloseIcon />
			</a>

			<div className="flex flex-row items-center gap-1">
				<TreeIcon />
				<div className="text-xl font-bold">{i18n.treeDetail.title}</div>
			</div>
			{treeCoreData ? (
				<div className="flex flex-col">
					<TreeAdoptCard
						treeData={treeCoreData}
						treeAgeClassification={treeAgeClassification}
					/>

					{/* What a volunteer standing at the tree needs first. */}
					<div className="flex flex-col gap-2 border-b-2 pb-6 pt-6">
						<TreeStatus
							treeAgeClassification={treeAgeClassification}
							treeWateringData={treeWateringData}
						/>
						<WaterTree
							treeData={treeCoreData}
							treeAgeClassification={treeAgeClassification}
						/>
					</div>

					<TreeWaterNeed
						treeAgeClassification={treeAgeClassification}
						treeWateringData={treeWateringData}
					/>
					<LastWaterings treeWateringData={treeWateringData} />

					<TreeAge treeData={treeCoreData} />
					<TreeFacts treeData={treeCoreData} />
					{treeTypeInfo && (
						<TreeFlier info={treeTypeInfo.description}></TreeFlier>
					)}
					<ProblemCard />
				</div>
			) : (
				<Loading loadingText={i18n.loading.treeLoading} />
			)}
		</div>
	);
};
