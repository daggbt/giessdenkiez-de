import { createClient } from "@supabase/supabase-js";
import { withTimeout } from "../utils/fetch-with-timeout";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Generous for a slow mobile connection; a stalled request still ends in an error.
const REQUEST_TIMEOUT_MS = 20_000;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
	global: { fetch: withTimeout(REQUEST_TIMEOUT_MS) },
});
