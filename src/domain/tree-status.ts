import { city } from "../config/city";
import { AgeClass } from "./tree-age";

export type NeedStatus =
	| "OFF_SEASON"
	| "COUNCIL_CARE"
	| "ESTABLISHED"
	| "UNKNOWN_AGE"
	| "SATISFIED"
	| "PARTIAL"
	| "THIRSTY";

export function getNeedStatus({
	inSeason,
	ageClass,
	rain30dMm,
	watered30dL,
}: {
	inSeason: boolean;
	ageClass: AgeClass;
	rain30dMm: number;
	watered30dL: number;
}): NeedStatus {
	if (!inSeason) {
		return "OFF_SEASON";
	}
	if (ageClass === "BABY") {
		return "COUNCIL_CARE";
	}
	if (ageClass === "SENIOR") {
		return "ESTABLISHED";
	}
	if (ageClass === "UNKNOWN") {
		return "UNKNOWN_AGE";
	}

	const rainLitres = rain30dMm * city.rainCatchmentM2;
	if (rainLitres + watered30dL >= city.targetLitresPer30Days.JUNIOR) {
		return "SATISFIED";
	}
	return watered30dL > 0 ? "PARTIAL" : "THIRSTY";
}

// Yellow means "someone watered it recently but it is still short".
export const NEED_STATUS_COLOR_TOKEN: Record<
	NeedStatus,
	"gdk-neon-green" | "gdk-tree-yellow" | "gdk-tree-orange"
> = {
	OFF_SEASON: "gdk-neon-green",
	COUNCIL_CARE: "gdk-neon-green",
	ESTABLISHED: "gdk-neon-green",
	UNKNOWN_AGE: "gdk-neon-green",
	SATISFIED: "gdk-neon-green",
	PARTIAL: "gdk-tree-yellow",
	THIRSTY: "gdk-tree-orange",
};
