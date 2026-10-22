/**
 * A `fetch` that gives up after `timeoutMs`, so a request that hangs (a dead
 * mobile connection, a stalled API) ends in an error instead of a spinner that
 * never stops. The deadline also covers reading the body. A signal passed by
 * the caller still aborts the request.
 */
export function withTimeout(timeoutMs: number): typeof fetch {
	return (input, init) => {
		const controller = new AbortController();

		const callerSignal = init?.signal;
		if (callerSignal?.aborted) {
			controller.abort(callerSignal.reason);
		}
		callerSignal?.addEventListener(
			"abort",
			() => controller.abort(callerSignal.reason),
			{ once: true },
		);

		setTimeout(
			() =>
				controller.abort(
					new DOMException(
						`No response within ${timeoutMs} ms`,
						"TimeoutError",
					),
				),
			timeoutMs,
		);

		return fetch(input, { ...init, signal: controller.signal });
	};
}
