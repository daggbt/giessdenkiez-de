import React from "react";
import { useI18nStore } from "../../i18n/i18n-store";
import { Markdown } from "../markdown/markdown";
import { ExternalAnchorLink } from "../anchor-link/external-anchor-link";

export const Credits: React.FC = () => {
	const i18n = useI18nStore().i18n();
	return (
		<div className="flex w-full flex-col gap-2 text-xs text-gdk-gray">
			<Markdown
				// @ts-expect-error typing too complex
				components={{ a: ExternalAnchorLink }}
			>
				{i18n.info.credits.builtOn}
			</Markdown>
			<Markdown
				// @ts-expect-error typing too complex
				components={{ a: ExternalAnchorLink }}
			>
				{i18n.info.credits.data}
			</Markdown>
		</div>
	);
};
