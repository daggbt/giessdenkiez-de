import React, { useEffect, useRef, useState } from "react";
import { ColorLegend } from "../icons/color-legend-icon";
import { ColorLegendClose } from "../icons/color-legend-close-icon";
import { ColorLegendEllipse } from "../icons/color-legend-ellipse";
import { useI18nStore } from "../../i18n/i18n-store";
import { useFilterStore } from "../filter/filter-store";
import { NoTreesReason, toggleColorFilter } from "../legend/color-filter";

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

/** The colours that can be picked, in legend order. Class names are spelled out for Tailwind. */
const LEGEND_COLORS = [
	{
		color: "gdk-neon-green",
		label: "greenTrees",
		textClassName: "text-gdk-neon-green",
		backgroundClassName: "bg-gdk-neon-green",
	},
	{
		color: "gdk-tree-yellow",
		label: "yellowTrees",
		textClassName: "text-gdk-tree-yellow",
		backgroundClassName: "bg-gdk-tree-yellow",
	},
	{
		color: "gdk-tree-orange",
		label: "orangeTrees",
		textClassName: "text-gdk-tree-orange",
		backgroundClassName: "bg-gdk-tree-orange",
	},
] as const;

export interface LegendButtonProps {
	/** Whether the legend can be seen at all (not behind the splash screen). */
	isVisible: boolean;
}

export const LegendButton: React.FC<LegendButtonProps> = ({ isVisible }) => {
	// Open on the first visit, so the colours are explained before anyone asks.
	const [isLegendOpen, setIsLegendOpen] = useState(() => !hasSeenLegend());
	const [noTreesReason, setNoTreesReason] = useState<NoTreesReason>();
	const legendRef = useRef<HTMLDivElement>(null);
	const i18n = useI18nStore().i18n();
	const isSomeFilterActive = useFilterStore((store) =>
		store.isSomeFilterActive(),
	);
	const colorFilter = useFilterStore((store) => store.colorFilter);
	const pickedColor = LEGEND_COLORS.find(({ color }) => color === colorFilter);

	useEffect(() => {
		if (isVisible && isLegendOpen) {
			rememberLegendSeen();
		}
	}, [isVisible, isLegendOpen]);

	let hint = colorFilter
		? i18n.legend.unpickColorHint
		: i18n.legend.pickColorHint;
	if (noTreesReason) {
		hint = i18n.legend.noTrees[noTreesReason];
	}

	return (
		<div ref={legendRef} className="flex flex-col gap-1" data-testid="legend">
			{isLegendOpen && (
				<div className="pointer-events-auto flex flex-col gap-2 bg-gdk-white/75 rounded-3xl p-4">
					<div className="flex flex-col gap-1 font-semibold">
						{LEGEND_COLORS.map(({ color, label, textClassName }) => (
							<button
								key={color}
								type="button"
								aria-pressed={color === colorFilter}
								onClick={() => {
									setNoTreesReason(toggleColorFilter(color, legendRef.current));
								}}
								className={`-mx-2 flex flex-row items-center gap-3 rounded-full px-2 py-1 text-left hover:bg-blue-600 hover:bg-opacity-10 ${
									color === colorFilter
										? "bg-blue-600 bg-opacity-10 text-blue-600"
										: ""
								}`}
							>
								<ColorLegendEllipse className={`shrink-0 ${textClassName}`} />
								{i18n.legend[label]}
							</button>
						))}
						{(isSomeFilterActive || colorFilter) && (
							<div className="flex flex-row items-center gap-3 py-1">
								<ColorLegendEllipse className="shrink-0 text-gdk-tree-gray" />
								{i18n.legend.grayTrees}
							</div>
						)}
					</div>
					{/* As wide as the colours above, however long the text. */}
					<p role="status" className="w-0 min-w-full text-sm">
						{hint}
					</p>
				</div>
			)}
			<button
				className={`relative bg-gdk-white shadow-gdk-hard w-[56px] h-[56px] rounded-full
            flex items-center justify-center pointer-events-auto z-10
            text-gdk-gray hover:text-gdk-light-gray`}
				type="button"
				onClick={() => {
					setIsLegendOpen(!isLegendOpen);
					setNoTreesReason(undefined);
				}}
				title={i18n.legend.title}
				aria-expanded={isLegendOpen}
			>
				{!isLegendOpen ? <ColorLegend /> : <ColorLegendClose />}
				{/* A picked colour stays picked while the legend is closed. */}
				{!isLegendOpen && pickedColor && (
					<span
						aria-hidden="true"
						className={`absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-gdk-white ${pickedColor.backgroundClassName}`}
					/>
				)}
			</button>
		</div>
	);
};
