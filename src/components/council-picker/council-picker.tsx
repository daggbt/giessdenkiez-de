import React, { useEffect, useState } from "react";
import {
	CouncilId,
	councilAt,
	councilIds,
	councils,
} from "../../config/councils";
import { useI18nStore } from "../../i18n/i18n-store";
import { SpinnerIcon } from "../icons/spinner-icon";
import { useMapConstants } from "../map/hooks/use-map-constants";
import { useMapStore } from "../map/map-store";
import { reportFailedCouncils } from "../map/report-failed-councils";
import { useTreesLayerStore } from "../map/trees-layer-store";

/**
 * One button per council, which takes the map there and loads the council's
 * trees. The council the middle of the map is in shows as picked.
 */
export const CouncilPicker: React.FC = () => {
	const i18n = useI18nStore().i18n();
	const map = useMapStore((store) => store.map);
	const councilStatus = useTreesLayerStore((store) => store.councilStatus);
	const { MAP_INITIAL_ZOOM_LEVEL } = useMapConstants();
	const [pickedCouncil, setPickedCouncil] = useState<CouncilId>();

	useEffect(() => {
		if (!map) {
			return undefined;
		}
		const onMoveEnd = () => {
			const { lng, lat } = map.getCenter();
			setPickedCouncil(councilAt([lng, lat]));
		};
		onMoveEnd();
		map.on("moveend", onMoveEnd);
		return () => {
			map.off("moveend", onMoveEnd);
		};
	}, [map]);

	const pick = (council: CouncilId) => {
		setPickedCouncil(council);
		useTreesLayerStore
			.getState()
			.loadCouncils([council])
			.catch(reportFailedCouncils);
		map?.flyTo({
			center: councils[council].centre,
			zoom: MAP_INITIAL_ZOOM_LEVEL,
			essential: true,
		});
	};

	const loadingCouncil = councilIds.find(
		(id) => councilStatus[id] === "loading",
	);

	return (
		<div
			role="group"
			aria-label={i18n.councilPicker.label}
			data-testid="council-picker"
			// Four councils fit on a 360 px phone; more would scroll sideways.
			className="no-scrollbar pointer-events-auto flex flex-row gap-1.5 overflow-x-auto px-2 pb-2 pt-1 sm:gap-2 sm:px-1"
		>
			{councilIds.map((id) => {
				const isPicked = id === pickedCouncil;
				return (
					<button
						key={id}
						type="button"
						aria-pressed={isPicked}
						title={councils[id].name}
						onClick={() => pick(id)}
						className={`flex shrink-0 flex-row items-center gap-2 rounded-full px-2.5 py-2 text-sm font-semibold shadow-gdk-hard sm:px-4 ${
							isPicked
								? "bg-gdk-blue text-gdk-white"
								: "bg-gdk-white text-gdk-gray hover:bg-gdk-lighter-blue"
						}`}
					>
						{councils[id].shortName}
						{councilStatus[id] === "loading" && (
							<SpinnerIcon
								text={isPicked ? undefined : "text-gdk-lighter-blue"}
								fill={isPicked ? undefined : "fill-gdk-blue"}
							/>
						)}
					</button>
				);
			})}
			<span role="status" className="sr-only">
				{loadingCouncil
					? i18n.councilPicker.loading(councils[loadingCouncil].name)
					: ""}
			</span>
		</div>
	);
};
