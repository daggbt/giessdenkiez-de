import { afterEach, describe, expect, test, vi } from "vitest";
import { withTimeout } from "../../src/utils/fetch-with-timeout";

/** A `fetch` that never answers, but rejects like the real one when aborted. */
const hangingFetch = vi.fn(
	(_input: RequestInfo | URL, init?: RequestInit) =>
		new Promise<Response>((_resolve, reject) => {
			init?.signal?.addEventListener("abort", () =>
				reject(init.signal?.reason),
			);
		}),
);

describe("withTimeout", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	test("gives up after the timeout", async () => {
		vi.useFakeTimers();
		vi.stubGlobal("fetch", hangingFetch);

		const request = withTimeout(1000)("https://example.com");
		vi.advanceTimersByTime(1000);

		await expect(request).rejects.toThrow("No response within 1000 ms");
	});

	test("still lets the caller abort", async () => {
		vi.stubGlobal("fetch", hangingFetch);
		const controller = new AbortController();

		const request = withTimeout(60_000)("https://example.com", {
			signal: controller.signal,
		});
		controller.abort(new Error("Aborted by the caller"));

		await expect(request).rejects.toThrow("Aborted by the caller");
	});

	test("passes requests and options through", async () => {
		const response = new Response("ok");
		const fetchMock = vi.fn(async () => response);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			withTimeout(1000)("https://example.com", { method: "POST" }),
		).resolves.toBe(response);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com",
			expect.objectContaining({ method: "POST" }),
		);
	});
});
