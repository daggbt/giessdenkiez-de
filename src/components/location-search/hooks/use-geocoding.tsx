import { useState } from "react";

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

export function useGeocoding(): GeocodingResultState {
	const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[]>(
		[],
	);

	const clearGeocodingResults = () => {
		setGeocodingResults([]);
	};

	const fetchGeocodingResults = async (search: string) => {
		if (search.trim().length < 2) {
			setGeocodingResults([]);
			return;
		}

		const fetchData = async () => {
			try {
				const params = new URLSearchParams({
					autocomplete: "true",
					language: "en",
					country: "au",
					proximity: `${import.meta.env.VITE_MAP_CENTER_LNG},${import.meta.env.VITE_MAP_CENTER_LAT}`,
					bbox: import.meta.env.VITE_MAP_BOUNDING_BOX,
					access_token: import.meta.env.VITE_MAPBOX_API_KEY,
				});
				const geocodingUrl = `${
					import.meta.env.VITE_MAPBOX_API_ENDPOINT
				}/geocoding/v5/mapbox.places/${encodeURIComponent(search)}.json?${params.toString()}`;
				const res = await fetch(geocodingUrl);
				if (!res.ok) {
					return;
				}
				const json = (await res.json()) as { features: GeocodingResult[] };
				setGeocodingResults(json.features);
			} catch (_) {
				setGeocodingResults([]);
			}
		};

		fetchData().catch(console.error);
	};

	return { geocodingResults, clearGeocodingResults, fetchGeocodingResults };
}
