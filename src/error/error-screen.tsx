import React from "react";
import { useI18nStore } from "../i18n/i18n-store";
import { PrimaryButton } from "../components/buttons/primary";
import { SplashTreeIcon } from "../components/icons/splash-tree-icon";

export interface ErrorScreenProps {
	message: string;
}

/** Takes the place of something that cannot be shown, with a way to retry. */
export const ErrorScreen: React.FC<ErrorScreenProps> = ({ message }) => {
	const i18n = useI18nStore().i18n();
	return (
		<div
			role="alert"
			className="pointer-events-auto flex h-full w-full flex-col items-center justify-center gap-3 bg-gdk-white px-8"
		>
			<SplashTreeIcon />
			<p className="max-w-[360px] text-center">{message}</p>
			<PrimaryButton
				label={i18n.common.reload}
				onClick={() => window.location.reload()}
			/>
		</div>
	);
};
