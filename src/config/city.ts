// All City-of-Perth-specific domain constants live here.
// Deployment-specific values (keys, URLs, map centre/zoom) live in .env.

export const city = {
	appName: "Perth Tree Watering", // TODO(confirm): working title (Q1)
	councilName: "City of Perth",
	timeZone: "Australia/Perth",
	locale: "en-AU",

	// Open-Meteo point for rain; Perth CBD.
	weatherPoint: { lat: -31.9523, lng: 115.8613 },

	// Inclusive, 1-based months; may wrap over New Year.
	// TODO(confirm): volunteer watering season (Q2)
	wateringSeason: { start: { month: 11, day: 1 }, end: { month: 4, day: 30 } },

	// The City waters new trees for their first two years (City of Perth Urban Forest FAQ).
	// TODO(confirm): upper bound of "needs residents' help" (Q3)
	ageBands: { councilCareMaxYears: 2, needsHelpMaxYears: 5 },

	// Date the inventory was bulk-captured; DATE_PLANTED on this day means "planted before".
	// TODO(confirm): Q5
	inventoryCaptureDate: "2019-05-10",

	// Litres per 30 days a tree should receive (rain + waterings).
	// Only JUNIOR drives the map colour. The upstream project uses 200 L for juniors; Perth summers have
	// roughly double the evaporative demand, hence the placeholder.
	// TODO(confirm): Q4
	targetLitresPer30Days: { BABY: 200, JUNIOR: 400, SENIOR: 300, UNKNOWN: 200 },

	// 1 mm of rain on 1 m² = 1 litre (upstream's implicit assumption).
	rainCatchmentM2: 1,

	// Sanity cap for a single watering entry (also enforced in the DB).
	maxWateringLitres: 1000,

	// TODO(confirm): exact page (Q6)
	reportProblemUrl: "https://perth.wa.gov.au/",

	dataAttribution: {
		text: "Tree data © City of Perth, CC BY", // TODO(confirm): licence version (Q7)
		url: "https://www.data.gov.au/data/dataset/perth-trees-in-the-city",
	},
} as const;
