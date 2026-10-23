import React from "react";
import { HeartIcon } from "../icons/heart-icon";
import { useTreeAdoptStore } from "../tree-detail/stores/adopt-tree-store";
import { useProfileStore } from "../../shared-stores/profile-store";
import { useI18nStore } from "../../i18n/i18n-store";

export interface AdoptButtonProps {
	treeId: string;
}

export const AdoptButton: React.FC<AdoptButtonProps> = ({ treeId }) => {
	const i18n = useI18nStore().i18n();
	const { adoptTree, unadoptTree, isLoading } = useTreeAdoptStore();
	// Subscribed, so the heart follows the adopted list as soon as it changes.
	const isAdopted = useProfileStore((store) =>
		store.adoptedTrees.includes(treeId),
	);

	return (
		<button
			type="button"
			data-testid="adopt-button"
			aria-label={i18n.treeDetail.adoptHintTitle}
			aria-pressed={isAdopted}
			disabled={isLoading}
			onClick={() => (isAdopted ? unadoptTree(treeId) : adoptTree(treeId))}
		>
			<HeartIcon isAdopted={isAdopted} />
		</button>
	);
};
