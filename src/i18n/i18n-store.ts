import { create } from "zustand";
import { Content } from "./content-types";
import { en } from "./en";

// TODO: read from city config once src/config/city.ts exists (M1).
const locale = "en-AU";

interface I18NState {
	formatNumber: (number: number, round?: boolean) => string;
	formatDate: (date: Date) => string;
	i18n: () => Content;
}

export const useI18nStore = create<I18NState>()(() => ({
	formatNumber: (number: number, round?: boolean) => {
		return new Intl.NumberFormat(locale).format(
			round ? Math.round(number) : number,
		);
	},
	formatDate: (date: Date) => {
		return date.toLocaleDateString(locale, { dateStyle: "full" });
	},
	i18n: () => en,
}));
