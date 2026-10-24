import { councilIds, councils } from "../../config/councils";
import { useErrorStore } from "../../error/error-store";
import { useI18nStore } from "../../i18n/i18n-store";
import { useTreesLayerStore } from "./trees-layer-store";

/** Tells the user whose trees could not be loaded, for a rejected `loadCouncils`. */
export function reportFailedCouncils(error: unknown) {
	const { councilStatus } = useTreesLayerStore.getState();
	const failed = councilIds
		.filter((id) => councilStatus[id] === "error")
		.map((id) => councils[id].name);
	const i18n = useI18nStore.getState().i18n();
	useErrorStore
		.getState()
		.handleError(
			failed.length > 0
				? i18n.map.treesFailed(failed)
				: i18n.common.defaultErrorMessage,
			error,
		);
}
