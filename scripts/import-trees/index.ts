import { parseArgs } from "node:util";
import { CouncilId, councils } from "../../src/config/councils";
import { fetchAllFeatures } from "./fetch";
import { ImportReport, normaliseAll, TreeRecord } from "./normalise";
import {
	printSummary,
	pushToSupabase,
	writeCouncilGeoJson,
	writeReport,
	writeSeedSql,
} from "./outputs";
import { sources } from "./sources";

const { values } = parseArgs({
	options: {
		"out-trees": { type: "string", default: "public/data/trees" },
		"out-seed": { type: "string", default: "supabase/seed.sql" },
		push: { type: "boolean", default: false },
		"dry-run": { type: "boolean", default: false },
	},
});

async function main() {
	const dryRun = values["dry-run"];
	const supabaseUrl = process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	// Fail before the (slow) download if the push cannot work.
	if (values.push && !dryRun && (!supabaseUrl || !serviceRoleKey)) {
		throw new Error(
			"--push needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.",
		);
	}

	// One after the other: all councils or none, so a failed download leaves the
	// committed files as they were.
	const recordsByCouncil: Array<[CouncilId, TreeRecord[]]> = [];
	const reports: ImportReport[] = [];
	for (const source of sources) {
		console.log(
			`\nFetching the ${councils[source.council].name} tree inventory...`,
		);
		const features = await fetchAllFeatures(
			source.layerUrl,
			(fetched, expected) => console.log(`  ${fetched} / ${expected}`),
		);
		const result = normaliseAll(source, features);
		printSummary(result.report);
		recordsByCouncil.push([source.council, result.records]);
		reports.push(result.report);
	}
	const records = recordsByCouncil.flatMap(
		([, councilRecords]) => councilRecords,
	);

	if (dryRun) {
		console.log("\nDry run: no files written, nothing pushed.");
		return;
	}

	console.log("");
	for (const { file, bytes } of writeCouncilGeoJson(
		recordsByCouncil,
		values["out-trees"],
	)) {
		console.log(`Wrote ${file} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
	}
	writeSeedSql(records, values["out-seed"]);
	console.log(`Wrote ${values["out-seed"]}`);
	writeReport(reports, "data/import-report.json");
	console.log("Wrote data/import-report.json");

	if (values.push && supabaseUrl && serviceRoleKey) {
		await pushToSupabase(records, supabaseUrl, serviceRoleKey);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
