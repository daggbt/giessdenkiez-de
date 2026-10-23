import React, { useEffect, useState } from "react";
import { useI18nStore } from "../../i18n/i18n-store";
import { ClearIcon } from "../icons/clear-icon";
import { SearchIcon } from "../icons/search-icon";
import { useMapConstants } from "../map/hooks/use-map-constants";
import { useMapStore } from "../map/map-store";
import { GeocodingResult, useGeocoding } from "./hooks/use-geocoding";
import { useFilterStore } from "../filter/filter-store";
import { useSearchStore } from "./search-store";
import { FilterButton } from "./filter-button";

export const LocationSearch: React.FC = () => {
	const i18n = useI18nStore().i18n();

	const {
		setIsCurrentSearch,
		isPickedGeoSearchResult,
		setisPickedGeoSearchResult,
		isTextInSearchbar,
		setIsTextInSearchbar,
		clearSearch,
	} = useSearchStore();
	const [selectedGeocodingResultIndex, setSelectedGeocodingResultIndex] =
		useState(0);
	const [selectedGeocodingResult, setSelectedGeocodingResult] =
		useState<GeocodingResult>();

	const { map } = useMapStore();
	const { MAP_LOCATION_ZOOM_LEVEL } = useMapConstants();
	const { geocodingResults, clearGeocodingResults, fetchGeocodingResults } =
		useGeocoding();
	const { isFilterViewVisible, hideFilterView } = useFilterStore();

	const clearSearchAndGeocodingResults = () => {
		clearSearch();
		setSelectedGeocodingResult(undefined);
		clearGeocodingResults();
	};

	useEffect(() => {
		if (!isFilterViewVisible) {
			return;
		}

		clearSearch();
		clearGeocodingResults();

		if (isPickedGeoSearchResult.length === 0) {
			return;
		}

		setIsTextInSearchbar(true);
	}, [isFilterViewVisible]);

	useEffect(() => {
		if (!map) {
			return undefined;
		}

		map.on("dragstart", clearSearchAndGeocodingResults);
		map.on("click", clearSearchAndGeocodingResults);

		return () => {
			map.off("dragstart", clearSearchAndGeocodingResults);
			map.off("click", clearSearchAndGeocodingResults);
		};
	}, [map]);

	// A new list starts with its first entry selected.
	useEffect(() => {
		setSelectedGeocodingResultIndex(0);
	}, [geocodingResults]);

	const onGeocodingResultClick = (geocodingResult: GeocodingResult) => {
		map?.easeTo({
			center: [
				geocodingResult.geometry.coordinates[0],
				geocodingResult.geometry.coordinates[1],
			],
			essential: true,
			duration: 1500,
			zoom: MAP_LOCATION_ZOOM_LEVEL,
		});
		setSelectedGeocodingResult(geocodingResult);
		setisPickedGeoSearchResult(geocodingResult.place_name);
		setSelectedGeocodingResultIndex(0);
		clearGeocodingResults();
	};

	// Only keys typed into the search box, and only while there are results:
	// Enter elsewhere (e.g. in the watering dialog) is none of its business.
	const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (geocodingResults.length === 0) {
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelectedGeocodingResultIndex(
				Math.min(geocodingResults.length - 1, selectedGeocodingResultIndex + 1),
			);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelectedGeocodingResultIndex(
				Math.max(0, selectedGeocodingResultIndex - 1),
			);
		} else if (event.key === "Enter") {
			event.preventDefault();
			onGeocodingResultClick(
				geocodingResults[
					Math.min(selectedGeocodingResultIndex, geocodingResults.length - 1)
				],
			);
		}
	};

	return (
		<div className="flex flex-row w-full justify-center sm:justify-between pointer-events-auto gap-2 ">
			<div
				className={`flex flex-grow max-w-[80%] sm:max-w-[87%] h-fit flex-col pl-2 drop-shadow-md sm:pl-0`}
			>
				<form
					onSubmit={(e) => {
						e.preventDefault();
					}}
					className={`z-[2] flex flex-row items-center justify-center rounded-full bg-white`}
				>
					<button className="pl-4 hover:text-gdk-light-gray">
						<SearchIcon />
					</button>
					<input
						className={`w-full py-4 pl-2 focus:outline-none`}
						type="text"
						value={
							selectedGeocodingResult?.place_name || isPickedGeoSearchResult
						}
						onKeyDown={onSearchKeyDown}
						onChange={(e) => {
							setIsCurrentSearch(e.target.value);
							setisPickedGeoSearchResult(e.target.value);
							setSelectedGeocodingResult(undefined);
							fetchGeocodingResults(e.target.value);
							setIsTextInSearchbar(true);
						}}
						onFocus={() => {
							hideFilterView();
						}}
						placeholder={i18n.locationSearch.placeholder}
					/>
					<button
						className={`${
							isTextInSearchbar ? "opacity-100" : "opacity-0"
						} px-4 hover:text-gdk-light-gray`}
						onClick={() => {
							clearSearchAndGeocodingResults();
						}}
					>
						<ClearIcon />
					</button>
				</form>

				{geocodingResults.length > 0 && (
					<div className="z-[1] -mt-8 flex flex-col overflow-hidden rounded-b-3xl bg-white pt-8">
						{geocodingResults.map((geocodingResult, idx) => (
							<button
								key={`geocoding-result-${idx}`}
								className={`truncate px-4 py-4 text-left hover:cursor-pointer hover:bg-gdk-lighter-blue ${
									selectedGeocodingResultIndex === idx && "bg-gdk-lighter-blue"
								}`}
								onClick={() => onGeocodingResultClick(geocodingResult)}
							>
								{geocodingResult.place_name}
							</button>
						))}
					</div>
				)}
			</div>
			<div className="min-w-[10%] flex flex-col mr-1 lg:mr-0 sm:px-0">
				<FilterButton />
			</div>
		</div>
	);
};
