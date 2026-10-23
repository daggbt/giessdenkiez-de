import React, { useEffect, useState } from "react";
import { ColorLegend } from "../icons/color-legend-icon";
import { ColorLegendClose } from "../icons/color-legend-close-icon";
import { ColorLegendEllipse } from "../icons/color-legend-ellipse";
import { useI18nStore } from "../../i18n/i18n-store";
import { useFilterStore } from "../filter/filter-store";

const LEGEND_SEEN_KEY = "legend-seen";

function hasSeenLegend() {
	try {
		return localStorage.getItem(LEGEND_SEEN_KEY) === "true";
	} catch {
		// Storage can be unavailable (private mode, blocked site data).
		return false;
	}
}

function rememberLegendSeen() {
	try {
		localStorage.setItem(LEGEND_SEEN_KEY, "true");
	} catch {
		// Then it opens again next time, which is harmless.
	}
}

export interface LegendButtonProps {
	/** Whether the legend can be seen at all (not behind the splash screen). */
	isVisible: boolean;
}

export const LegendButton: React.FC<LegendButtonProps> = ({ isVisible }) => {
	// Open on the first visit, so the colours are explained before anyone asks.
	const [isLegendOpen, setIsLegendOpen] = useState(() => !hasSeenLegend());
	const i18n = useI18nStore().i18n();
	const isSomeFilterActive = useFilterStore((store) =>
		store.isSomeFilterActive(),
	);

	useEffect(() => {
		if (isVisible && isLegendOpen) {
			rememberLegendSeen();
		}
	}, [isVisible, isLegendOpen]);

	return (
		<div className="flex flex-col gap-1">
			{isLegendOpen && (
				<div className="flex flex-row justify-between items-center gap-3 bg-gdk-white/75 rounded-3xl p-4">
					<div className="flex flex-col gap-4">
						<ColorLegendEllipse className="text-gdk-neon-green" />
						<ColorLegendEllipse className="text-gdk-tree-yellow" />
						<ColorLegendEllipse className="text-gdk-tree-orange" />
						{isSomeFilterActive && (
							<ColorLegendEllipse className="text-gdk-tree-gray" />
						)}
					</div>
					<div className="flex flex-col gap-2.5 font-semibold">
						<div>{i18n.legend.greenTrees}</div>
						<div>{i18n.legend.yellowTrees}</div>
						<div>{i18n.legend.orangeTrees}</div>
						{isSomeFilterActive && <div>{i18n.legend.grayTrees}</div>}
					</div>
				</div>
			)}
			<button
				className={`bg-gdk-white shadow-gdk-hard w-[56px] h-[56px] rounded-full
            flex items-center justify-center pointer-events-auto z-10
            text-gdk-gray hover:text-gdk-light-gray`}
				type="button"
				onClick={() => {
					setIsLegendOpen(!isLegendOpen);
				}}
				title={i18n.legend.title}
				aria-expanded={isLegendOpen}
			>
				{!isLegendOpen ? <ColorLegend /> : <ColorLegendClose />}
			</button>
		</div>
	);
};
