import { useEffect, useRef, useState } from "react";
import { mapAreaBbox } from "../../../config/councils";

export interface GeocodingResult {
	id: string;
	place_name: string;
	geometry: {
		coordinates: [number, number];
	};
}

export interface GeocodingResultState {
	geocodingResults: GeocodingResult[];
	clearGeocodingResults: () => void;
	fetchGeocodingResults: (search: string) => void;
}

/**
 * Waits for a pause in typing before asking Mapbox: every request counts
 * against the geocoding quota.
 */
const TYPING_PAUSE_MS = 250;

export function useGeocoding(): GeocodingResultState {
	const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[]>(
		[],
	);

	// The search that is waiting for the typing pause or for its answer.
	const pending = useRef<{
		timeoutId?: ReturnType<typeof setTimeout>;
		controller?: AbortController;
	}>({});

	const cancelPending = () => {
		clearTimeout(pending.current.timeoutId);
		pending.current.controller?.abort();
		pending.current = {};
	};

	useEffect(() => cancelPending, []);

	const clearGeocodingResults = () => {
		cancelPending();
		setGeocodingResults([]);
	};

	const fetchGeocodingResults = (search: string) => {
		// An older, slower answer must not overwrite the results of a newer search.
		cancelPending();

		if (search.trim().length < 2) {
			setGeocodingResults([]);
			return;
		}

		const controller = new AbortController();

		const fetchData = async () => {
			try {
				const params = new URLSearchParams({
					autocomplete: "true",
					language: "en",
					country: "au",
					proximity: `${import.meta.env.VITE_MAP_CENTER_LNG},${import.meta.env.VITE_MAP_CENTER_LAT}`,
					bbox: mapAreaBbox.join(","),
					access_token: import.meta.env.VITE_MAPBOX_API_KEY,
				});
				const geocodingUrl = `${
					import.meta.env.VITE_MAPBOX_API_ENDPOINT
				}/geocoding/v5/mapbox.places/${encodeURIComponent(search)}.json?${params.toString()}`;
				const res = await fetch(geocodingUrl, { signal: controller.signal });
				if (!res.ok) {
					return;
				}
				const json = (await res.json()) as { features: GeocodingResult[] };
				setGeocodingResults(json.features);
			} catch (_) {
				if (!controller.signal.aborted) {
					setGeocodingResults([]);
				}
			}
		};

		pending.current = {
			controller,
			timeoutId: setTimeout(() => {
				fetchData().catch(console.error);
			}, TYPING_PAUSE_MS),
		};
	};

	return { geocodingResults, clearGeocodingResults, fetchGeocodingResults };
}
