import { formatDistance, parseISO } from "date-fns";
import { city } from "../../config/city";
import { toCityDateString } from "../../domain/time";
import type { TreePlantingInfo } from "../../domain/tree-age";
import { Content } from "../../i18n/content-types";

type PlantedTexts = Content["treeDetail"]["planted"];

const dateFormatter = new Intl.DateTimeFormat(city.locale, {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

/** "Planted 3 July 2023 (about 3 years ago)", depending on how precise the date is. */
export function formatPlantingLine(
	tree: TreePlantingInfo,
	now: Date,
	texts: PlantedTexts,
): string {
	if (tree.planted_date === null) {
		return tree.planted_date_precision === "before_2019"
			? texts.beforeInventory
			: texts.unknown;
	}

	if (tree.planted_date_precision === "year") {
		return texts.year(tree.planted_date.slice(0, 4));
	}

	if (tree.planted_date_precision === "day") {
		const planted = parseISO(tree.planted_date);
		const date = dateFormatter.format(
			new Date(`${tree.planted_date}T00:00:00Z`),
		);
		const ago =
			tree.planted_date >= toCityDateString(now)
				? "today"
				: formatDistance(planted, parseISO(toCityDateString(now)), {
						addSuffix: true,
					});
		return texts.day(date, ago);
	}

	return texts.unknown;
}
