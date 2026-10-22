import { isInWateringSeason } from "../domain/season";
import { getNow } from "../domain/time";

export function useIsInWateringSeason(): boolean {
	return isInWateringSeason(getNow());
}
