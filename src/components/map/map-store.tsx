import * as mapboxgl from "mapbox-gl";
import { create } from "zustand";

/**
 * Why the map cannot be shown: `unsupported` when the browser has no WebGL,
 * `failed` when Mapbox did not deliver (rejected token, network, outage).
 */
export type MapError = "unsupported" | "failed";

interface MapState {
	map: mapboxgl.Map | undefined;
	setMap: (map: mapboxgl.Map | undefined) => void;
	isMapLoaded: boolean;
	setIsMapLoaded: (isMapLoaded: boolean) => void;
	mapError: MapError | undefined;
	setMapError: (mapError: MapError | undefined) => void;
}

export const useMapStore = create<MapState>()((set) => ({
	map: undefined,
	setMap: (map: mapboxgl.Map | undefined) => {
		set({ map });
	},
	isMapLoaded: false,
	setIsMapLoaded: (isMapLoaded: boolean) => {
		set({ isMapLoaded });
	},
	mapError: undefined,
	setMapError: (mapError: MapError | undefined) => {
		set({ mapError });
	},
}));
