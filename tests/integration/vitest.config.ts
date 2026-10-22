import { defineConfig, loadEnv } from "vite";

// eslint-disable-next-line @technologiestiftung/no-default-export
export default defineConfig(({ mode }) => ({
	test: {
		include: ["./tests/integration/**/*.test.ts"],
		testTimeout: 30_000,
		// Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_ANON_KEY from .env
		env: loadEnv(mode, process.cwd(), ""),
	},
}));
