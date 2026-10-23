import { create } from "zustand";

interface SetPathnameOptions {
	hasSameSearchParams?: boolean;
	hasSameHash?: boolean;
	/** Replaces the current history entry, e.g. for a redirect. */
	isReplacing?: boolean;
}

interface SetSearchParamsOptions {
	/**
	 * Adds a history entry, so that Back undoes the change (opening or closing
	 * a tree). Map moves and filters replace the current entry instead, or
	 * every pan would be a step back.
	 */
	isNewHistoryEntry?: boolean;
}

interface URLState {
	url: URL;
	setPathname: (url: string, options?: SetPathnameOptions) => void;
	setSearchParams: (
		searchParams: URLSearchParams,
		options?: SetSearchParamsOptions,
	) => void;
	addSearchParam: (
		key: string,
		value: string,
		options?: SetSearchParamsOptions,
	) => void;
	removeSearchParam: (
		keyToRemove: string,
		options?: SetSearchParamsOptions,
	) => void;
	/** Takes over the browser's URL after Back or Forward, adding no history. */
	syncWithBrowser: () => void;
}

/**
 * Search param changes reach the address bar after a short pause, so that a
 * map move, which changes several params many times, writes history once.
 */
let pendingUpdate:
	| {
			url: URL;
			isNewHistoryEntry: boolean;
			timeoutId: ReturnType<typeof setTimeout>;
	  }
	| undefined;

function writePendingUpdate() {
	if (!pendingUpdate) {
		return;
	}
	clearTimeout(pendingUpdate.timeoutId);
	if (pendingUpdate.isNewHistoryEntry) {
		window.history.pushState({}, "", pendingUpdate.url);
	} else {
		window.history.replaceState({}, "", pendingUpdate.url);
	}
	pendingUpdate = undefined;
}

function cancelPendingUpdate() {
	clearTimeout(pendingUpdate?.timeoutId);
	pendingUpdate = undefined;
}

export const useUrlState = create<URLState>()((set, get) => ({
	url: new URL(window.location.href),

	setPathname: (
		pathname,
		{
			hasSameSearchParams = false,
			hasSameHash = false,
			isReplacing = false,
		} = {},
	) => {
		const url = new URL(pathname, get().url.origin);

		if (hasSameSearchParams) {
			url.search = get().url.search;
		}

		if (hasSameHash) {
			url.hash = get().url.hash;
		}

		// The page being left keeps its latest params in its history entry.
		writePendingUpdate();

		set({ url });

		if (isReplacing) {
			window.history.replaceState({}, "", url);
		} else {
			window.history.pushState({}, "", url);
		}
	},

	setSearchParams: (searchParams, { isNewHistoryEntry = false } = {}) => {
		const url = new URL(get().url);
		url.search = searchParams.toString();

		// Nothing to write, and an unchanged URL must not become a history entry.
		if (url.href === get().url.href) {
			return;
		}

		set({ url });

		const isPendingNewEntry = pendingUpdate?.isNewHistoryEntry ?? false;
		cancelPendingUpdate();
		pendingUpdate = {
			url,
			isNewHistoryEntry: isPendingNewEntry || isNewHistoryEntry,
			timeoutId: setTimeout(writePendingUpdate, 500),
		};
	},

	addSearchParam: (key, value, options) => {
		const url = new URL(get().url);
		url.searchParams.set(key, value);
		get().setSearchParams(url.searchParams, options);
	},

	removeSearchParam: (keyToRemove, options) => {
		const url = new URL(get().url);
		url.searchParams.delete(keyToRemove);
		get().setSearchParams(url.searchParams, options);
	},

	syncWithBrowser: () => {
		// The browser has moved to another entry; a pending write would overwrite it.
		cancelPendingUpdate();
		set({ url: new URL(window.location.href) });
	},
}));
