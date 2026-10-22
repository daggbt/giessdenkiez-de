import React from "react";
import { SplashTreeIcon } from "../icons/splash-tree-icon";
import { useI18nStore } from "../../i18n/i18n-store";
import { Markdown } from "../markdown/markdown";

export interface LoadingProps {
	loadingText: string;
	isPrivacyVisible?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
	loadingText,
	isPrivacyVisible = false,
}) => {
	const i18n = useI18nStore().i18n();
	return (
		<div className="h-full w-full flex flex-col justify-center bg-gdk-white items-center gap-3 pointer-events-auto">
			<div className="animate-bounce">
				<SplashTreeIcon />
			</div>
			<p className="w-[270px] text-center	">{loadingText}</p>
			{isPrivacyVisible && (
				<div className="flex flex-row gap-3 text-slate-300">
					<a
						href={i18n.map.attribution.privacy.href}
						key={i18n.map.attribution.privacy.label}
						target="_blank"
						className="underline hover:text-gdk-lighter-gray"
						rel="noopener noreferrer"
					>
						<Markdown>{i18n.map.attribution.privacy.label}</Markdown>
					</a>
				</div>
			)}
		</div>
	);
};
