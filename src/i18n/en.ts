import { city } from "../config/city";
import {
	councilIds,
	councilNames,
	councils,
	formatList,
} from "../config/councils";
import { formatMonthRange, getSeasonMonths } from "../domain/season";
import { Content } from "./content-types";

const allCouncils = councilIds.map((id) => councils[id]);

const careYearsList = allCouncils
	.map(
		({ name, councilCareMaxYears, careSource }) =>
			`- ${name}: ${councilCareMaxYears} years ([${careSource.label}](${careSource.url}))`,
	)
	.join("\n");

const reportProblemList = allCouncils
	.map(({ name, reportProblemUrl }) => `- [${name}](${reportProblemUrl})`)
	.join("\n");

const treeDataList = allCouncils
	.map(
		({ name, treeData }) =>
			`- [${treeData.label}, ${name}](${treeData.url})${treeData.licence ? ` (${treeData.licence})` : ""}`,
	)
	.join("\n");

// "The City of Fremantle, the City of Cockburn and the Town of Bassendean"
const councilsWithoutLicence = formatList(
	allCouncils
		.filter(({ treeData }) => treeData.licence === null)
		.map(({ name }) => `the ${name}`),
).replace(/^the/, "The");

// TODO(confirm): wording to be reviewed (Q8)
const acknowledgementOfCountry =
	"We acknowledge the Whadjuk Noongar people as the Traditional Custodians of the land on which this project operates, and pay our respects to Elders past and present.";

export const en: Content = {
	map: {
		attribution: {
			mapbox: {
				href: "https://www.mapbox.com/about/maps/",
				label: "© Mapbox",
			},
			openStreetMap: {
				href: "https://www.openstreetmap.org/copyright",
				label: "© OpenStreetMap",
			},
			// The information page lists each council's data and licence.
			treeData: {
				href: "/about",
				label: `Tree data © ${formatList(allCouncils.map(({ shortName }) => shortName))} councils`,
			},
			weather: {
				href: "https://open-meteo.com/",
				label: "Weather data by Open-Meteo.com",
			},
			improve: {
				href: "https://www.mapbox.com/map-feedback",
				label: "**Improve this map**",
			},
			privacy: {
				href: "/about",
				label: "Privacy",
			},
		},
		unavailable: {
			unsupported:
				"This browser cannot show the map: WebGL is turned off or not available. Try another browser, or turn on hardware acceleration. Your profile and the information pages still work.",
			failed:
				"The map could not be loaded. Please check your connection and reload the page.",
		},
	},
	locationSearch: {
		placeholder: "Search for an address",
	},
	legend: {
		title: "Legend",
		greenTrees: "Fine for now, or watered by its council",
		yellowTrees: "Watered recently, needs more",
		orangeTrees: "Thirsty \u2014 needs water",
		grayTrees: "Filtered out",
		pickColorHint: "Tap a colour to see where those trees are.",
		unpickColorHint: "Tap the colour again to see all trees.",
		noTrees: {
			offSeason: `The watering season runs ${formatMonthRange(getSeasonMonths().season)}. Until then, all trees are green.`,
			filters: "No trees of this colour match your filters.",
			none: "No trees have this colour right now.",
		},
	},
	navbar: {
		map: "Map",
		profile: {
			sidebarLabel: "Profile",
			title: "Your profile",
			overview: {
				subtitle: "Your overview",
				irrigations: "Waterings",
				liter: "Litres",
				adoptedTrees: "Adopted trees",
			},
			adoptedTrees: {
				subtitle: "Adopted trees",
				irrigationTimes: (count: number) => (count === 1 ? "time" : "times"),
				irrigationAmount: "litres",
				showAll: "Show all",
				showLess: "Show less",
				noAdoptedTreesMessage:
					"If you regularly water a tree, you can adopt it. The trees you have adopted will be displayed here.",
			},
			settings: {
				subtitle: "Profile details",
				username: "Username",
				yourUsername: "Your username",
				editUsername: "New username",
				placeholderUser: "Your username",
				updateEmailEmailSentTitle: "E-Mail sent!",
				updateEmailEmailSentMessage:
					"We sent you an email with a confirmation link to your new email address to confirm the change. Check your mailbox!",
				passwordChangeWithoutRecoveryLinkTitle: "An error occurred.",
				passwordChangeWithoutRecoveryLinkMessage:
					"Note: This page can only be accessed if the password reset link in the email has been clicked previously.",
				passwordChangeWithoutRecoveryLinkLinkLabel: "Back to home",
				pleaseWait: "Please wait a moment...",
				email: "Email",
				yourEmail: "Your email address",
				editEmail: "New email address",
				placeholderMail: "name@example.com",
				password: "Password",
				changePassword: "Change password",
				newPassword: "New password",
				passwordChangeConfirmationTitle:
					"Your password was successfully changed!",
				passwordChangeConfirmationMessage: 'Press "OK" to go to your profile.',
				deleteAccount: "Delete account",
				confirmDelete: "Delete",
				cancel: "Cancel",
				save: "Save",
				confirm: "OK",
				usernamePublicNotice:
					"Your username and your waterings (amount and date) are visible to everyone.",
				approve: "Done",
				checkInput: "Please check your input",
				usernameShould: "Your username needs to: ",
				usernameLength: "be at least 3-50 characters long",
				onlyNumberAndLetters: "and consist only of letters or numbers",
				usernameTaken: "This username is already taken",
				emailTaken: "An account with this email already exists",
				backToLogin: "Back to login",
				register: "Register",
				confirmEmailTitle: "Confirm account",
				confirmEmail: (email: string) =>
					`Check your inbox for "${email}", you should have received a mail containing a link to activate your account.`,
				existingAccount: "Do you already have an account?",
				logIn: "Login",
				passwordShould: "Your password needs to contain:",
				passwordLength: "at least 8 characters",
				passwordUpperAndLowerCase: "upper and lower case letters",
				passwordSpecialChar: "at least one special character",
				passwordNumber: "at least one number",
				logInShort: "Login",
				missingAccount: "Don't have an account yet?",
				registerNow: "Register now",
				forgotYourPassword: "forget your password?",
				ohNoforgotYourPassword: "Oh no. Did you",
				passwordForgotten: "Reset your password",
				resetPasswordEmailSentTitle: "Email sent!",
				resetPasswordEmailSentMessage:
					"We sent you an email with a link to reset your password. Check your mailbox!",
				clickHere: "click here",
				resetPassword: "Reset password",
				invalidCredentials: "Invalid credentials",
				deleteAccountConfirm: "Are you sure you want to delete your account?",
			},
			logOut: "Log out",
			showPassword: "Show",
			hidePassword: "Hide",
		},
		info: "Info",
	},
	notFound: {
		title: "404 - Page Not Found",
	},
	info: {
		infoTitel: "Information",
		about: {
			head: {
				question: "About the project",
				answer: `Young street trees in ${city.areaName} need extra water through hot, dry summers. ${city.appName} shows which trees are thirsty, so volunteers can help the ones that need it most.

Pick a tree on the map, see how old it is and how much rain and water it has had in the last 30 days, then log your watering. Trees you adopt appear in your profile.`,
				aboutUsTitle: "About us",
				aboutUsAnswer: `${city.appName} is a community prototype built on [Gieß den Kiez](https://github.com/technologiestiftung/giessdenkiez-de) by Technologiestiftung Berlin and CityLAB Berlin (MIT licence). It is not run by any of the councils whose trees it shows.`,
				acknowledgementTitle: "Acknowledgement of Country",
				// TODO(confirm): wording to be reviewed (Q8)
				acknowledgement: acknowledgementOfCountry,
				privacyTitle: "Privacy",
				// TODO(confirm): needs review; not legal advice (Q8)
				privacy: `**What we collect.** Your email address, your username, the waterings you log (tree, amount and date) and the trees you adopt.

**What is public.** Your username and the amount and date of each watering you log are visible to everyone, next to the tree you watered. Your email address is never shown.

**Where it is stored.** In a Supabase database in Sydney, Australia.

**How to delete it.** Go to Profile and choose "Delete account". This removes your account and your adoptions. Your waterings stay on the trees but are shown as "Former user".

**Contact.** Contact details will be added before launch.`,
			},
			qa: [
				{
					question: "Useful links",
					answer: `How long the councils water new trees:

${careYearsList}

Report a problem with a tree:

${reportProblemList}`,
				},
				{
					question: "Data sources",
					answer: `The map shows the public trees in the inventories of the ${councilNames}. Trees on private land and in other council areas are not included.

${treeDataList}

${councilsWithoutLicence} publish their tree data without stating a licence. This non-commercial prototype shows it with credit to them.

Rain from [Open-Meteo](https://open-meteo.com/), and map data from [Mapbox](https://www.mapbox.com/about/maps/) and [OpenStreetMap](https://www.openstreetmap.org/copyright).`,
				},
			],
		},
		faq: {
			title: "F.A.Q.",
			description: "The most frequently asked questions.",
			qa: [
				{
					question: "What is this?",
					answer: `Volunteers help young street trees in ${city.areaName} through hot, dry summers. This map shows which trees are thirsty, and lets you log when you water one.`,
				},
				{
					question: "Why do young trees need help in Perth?",
					answer: `Perth summers are long and dry. The councils water new trees for their first years:

${careYearsList}

After that, young trees are still building their roots and can struggle without rain.`,
				},
				{
					question: "Which trees should I water?",
					answer: `Look for orange trees first, then yellow ones.

- **Orange**: thirsty. Its council no longer waters it, it is younger than ${city.needsHelpMaxYears} years, and it had little rain or water in the last 30 days.
- **Yellow**: watered recently, but still needs more.
- **Green**: fine for now, or watered by its council.

The watering season runs ${formatMonthRange(getSeasonMonths().season)}. Outside it, the trees do not need extra water.`,
				},
				{
					question: "How much and how should I water?",
					// TODO(confirm): official hand-watering guidance for residents (Q4)
					answer: `We have not yet confirmed official guidance on how much to water. As a target, a young tree should get about ${city.targetLitresPer30Days.JUNIOR} litres from rain and watering over 30 days. Please water slowly, so the water soaks in rather than running off.`,
				},
				{
					question: "What do the colours and the ring mean?",
					answer: `The ring on a tree's page compares the water the tree needs over 30 days with the rain that fell (from Open-Meteo) plus the waterings people logged. When the ring is full, the tree is green.`,
				},
				{
					question: "Why is a tree missing or wrong?",
					answer: `The map uses the councils' inventories of public trees. Private trees and trees in other council areas are not included. If a record is wrong, please report it to the tree's council: the link is at the bottom of the tree's page.`,
				},
				{
					question: "Why does a tree never turn orange?",
					answer: `We need a tree's planting date to tell whether it is young. Not every council records planting dates, and many older trees have none. Without one, a tree stays green and its page says the planting date is unknown.`,
				},
				{
					question: `What does "planted before ${city.inventoryCaptureDate.slice(0, 4)}" mean?`,
					answer: `Many City of Perth records carry the date of its ${city.inventoryCaptureDate.slice(0, 4)} inventory instead of the real planting date. We treat those trees as established.`,
				},
				{
					question: "What is public about me?",
					answer: `Your username and the amount and date of your waterings are visible to everyone. To remove your account, go to Profile and choose "Delete account". Your waterings then show as "Former user".`,
				},
				{
					question: "What should I do if I watered a tree incorrectly?",
					answer: `Open the tree, scroll to the last waterings and delete your entry. You can only delete your own entries.`,
				},
				{
					question: "Who made this?",
					answer: `${city.appName} is built on [Gieß den Kiez](https://github.com/technologiestiftung/giessdenkiez-de) by Technologiestiftung Berlin and CityLAB Berlin (MIT licence). See the credits on this page.`,
				},
				{
					question: "I still have a question!",
					// TODO(confirm): contact email (Q8)
					answer: `Contact details will be added before launch.`,
				},
			],
		},
		share: {
			title: `Share ${city.appName} with those around you and help the trees:`,
			content: `On ${city.appName} you can find thirsty trees in ${city.areaName} and record when you watered them!`,
			openSource: `${city.appName} is built on the [open source Gieß den Kiez](https://github.com/technologiestiftung/giessdenkiez-de).`,
		},
		credits: {
			builtOn:
				"Built on [Gieß den Kiez](https://github.com/technologiestiftung/giessdenkiez-de) by Technologiestiftung Berlin and CityLAB Berlin (MIT licence).",
			data: `Tree data © ${formatList(allCouncils.map(({ name, treeData }) => (treeData.licence ? `${name} (${treeData.licence})` : name)))}. Weather data by [Open-Meteo](https://open-meteo.com/). Map data © [Mapbox](https://www.mapbox.com/about/maps/) and [OpenStreetMap](https://www.openstreetmap.org/copyright).`,
		},
	},
	treeDetail: {
		title: "Tree information",
		adoptIt: "Adopt this tree",
		alsoAdoptedByOtherUsers: "Also adopted by other users",
		onlyAdoptedByOtherUsers: "Adopted by other users",
		ageTitle: "Age",
		planted: {
			day: (date: string, ago: string) => `Planted ${date} (${ago})`,
			year: (year: string) => `Planted in ${year}`,
			beforeInventory: `Planted before ${city.inventoryCaptureDate.slice(0, 4)}`,
			unknown: "Planting date unknown",
		},
		facts: {
			council: "Council",
			suburb: "Suburb",
			height: "Height",
			heightValue: (metres: string) => `${metres} m`,
			family: "Family",
			rare: "Rare species",
			heritage: "Heritage",
			significant: "Community significance",
			significantGroup: "Significant group",
		},
		status: {
			thirsty: (litres: string) =>
				`**Thirsty:** still needs about ${litres} litres`,
			partial: (litres: string) =>
				`**Watered recently,** but still needs about ${litres} litres`,
			satisfied: "**Well watered** for now",
			councilCare: (councilName: string) =>
				`**Watered by the ${councilName}:** no need to water yet`,
			established: "**Established tree:** no need to water",
			unknownAge: "**Water needs unknown:** the planting date is not known",
			offSeason: (seasonMonths: string) =>
				`**Outside the watering season.** The season runs ${seasonMonths}; until then, no need to water.`,
		},
		adoptLoading: "Tree is being adopted...",
		unadoptLoading: "Adoption is being canceled...",
		isAdopted: "You have adopted this tree",
		adoptHintTitle: "Adopt a tree",
		adoptHint:
			"If you water this tree on a regular basis, you can adopt it. This way you can find it in your profile.",
		adoptErrorMessage: "Error adopting the tree. Please try again.",
		adoptLoginFirst: "Please log in first to adopt this tree",
		treeTypeUnknown: "Tree species unknown",
		managedBy: (councilName: string, councilCareMaxYears: number) =>
			`The ${councilName} waters new trees for their first ${councilCareMaxYears} years, so this tree does not need your help yet.`,
		waterNeed: {
			title: "Water needs",
			hintOffSeason: (seasonMonths: string) =>
				`The watering season runs ${seasonMonths}. Until then, rain usually covers the trees' needs.`,
			hint: "Depending on the age of the tree, the need for water varies.",
			needXLiters: (liters: string) =>
				`Target: ${liters} L every 30 days (rain included)`,
			waterManagedBaby: "Watered by the council",
			waterManagedSenior: "Established tree",
			offSeasonTitle: "Outside the watering season",
			unknownTitle: "Water needs **unknown**",
			unknownShort: "Unknown",
			liters: "litres",
			watered: "watered",
			rained: "rain",
			stillMissing: "still missing",
			dataOfLastXDays: "* data of last 30 days",
			weatherUnavailable:
				"Rain data currently unavailable \u2014 showing waterings only.",
			coveredByCity: "Watered by the council",
			coveredEstablished: "Established",
			alreadyWateredByManager: (councilName: string) =>
				`Watered by the **${councilName}**`,
			alreadyWateredByEstablished: "**Established** tree",
			offSeasonRing: "No watering needed outside the season",
			stillWaterXLiters: (liters: string) => `
Needs

**${liters} litres**`,
			sufficientlyWatered: "Sufficiently watered at the moment",
			ageAndWaterHint: (
				{ name, councilCareMaxYears, careSource },
				needsHelpMaxYears: number,
			) => `
**Under ${councilCareMaxYears} years**: the ${name} waters new trees ([source: ${careSource.label}](${careSource.url})).

**${councilCareMaxYears}\u2013${needsHelpMaxYears} years**: these trees benefit most from your help.

**Older trees (${needsHelpMaxYears}+ years)**: usually established.`,
			ageAndWaterHintOffSeason: (
				seasonMonths: string,
				offSeasonMonths: string,
			) => `
The watering season is ${seasonMonths}. Outside the season (${offSeasonMonths}) rain usually covers the trees' needs.`,
			readMore: "Show more",
			close: "Show less",
			iWatered: "I watered",
			loginToWater: {
				login: "Log-in",
				toWater: "to submit a watering",
			},
			submitWatering: "Submit watering",
			wateredHowMuch: "Litres",
			wateredHowMuchPlaceholder: "Amount in L",
			wateredWhen: "When?",
			waterSave: "Save",
			waterCancel: "Cancel",
			wateringSuccessful: "Your watering entry was successful!",
			wateringFailed:
				"Your watering could not be saved. Please check your connection and try again.",
		},
		lastWaterings: {
			deletedAccount: "Former user",
			title: "Last waterings",
			last30Days: "Last 30 days",
			nothingLast30Days: "No waterings in the last 30 days",
			before: "Previous",
			nothingBefore: "No previous waterings",
			delete: "Delete",
		},
		problem: {
			title: "Report a problem",
			description: (councilName: string) =>
				`Noticed damage or a problem with this tree? Report it to the ${councilName}.`,
			link: (councilName: string) => `Contact the ${councilName}`,
		},
		// TODO(confirm): species text drafted by agent, needs review (Q10)
		treeTypeInfos: [
			{
				id: "Eucalyptus",
				title: "Eucalyptus (gum trees)",
				description:
					"Eucalyptus is a large genus of mostly Australian trees, including many gums. Several species are native to Western Australia, and they are widely planted as street and park trees.",
			},
			{
				id: "Platanus",
				title: "Plane tree (Platanus)",
				description:
					"Plane trees are deciduous trees originally from the Northern Hemisphere. The London plane (Platanus \u00d7 acerifolia) is a hybrid that is planted in streets in cities around the world because it copes well with urban conditions. It loses its leaves in autumn.",
			},
			{
				id: "Corymbia",
				title: "Bloodwood and spotted gum (Corymbia)",
				description:
					"Corymbia was split off from Eucalyptus and is also Australian. Marri (Corymbia calophylla) is native to the south-west of Western Australia.",
			},
			{
				id: "Melaleuca",
				title: "Paperbark (Melaleuca)",
				description:
					"Melaleucas, or paperbarks, are Australian trees and shrubs with papery, layered bark. Many species grow naturally near wetlands and watercourses, and several are native to Western Australia.",
			},
			{
				id: "Jacaranda",
				title: "Jacaranda",
				description:
					"The jacaranda (Jacaranda mimosifolia) comes from South America and is planted in warm climates around the world. It is known for its purple flowers in late spring. It is not native to Australia.",
			},
			{
				id: "Lophostemon",
				title: "Brisbane box (Lophostemon)",
				description:
					"The Brisbane box (Lophostemon confertus) is native to eastern Australia and is a common evergreen street tree in Australian cities.",
			},
			{
				id: "Agonis",
				title: "Peppermint tree (Agonis)",
				description:
					"The peppermint tree (Agonis flexuosa) is native to the south-west of Western Australia. It is widely planted in streets and gardens and has a weeping habit and peppermint-scented leaves.",
			},
			{
				id: "Casuarina",
				title: "She-oak (Casuarina)",
				description:
					"She-oaks are Australian evergreen trees with needle-like green branchlets instead of ordinary leaves. They are often planted as street and park trees.",
			},
			{
				id: "Phoenix",
				title: "Date palm (Phoenix)",
				description:
					"Phoenix is a genus of palms. The Canary Island date palm (Phoenix canariensis), originally from the Canary Islands, is a large feather-leaved palm that is widely planted along streets.",
			},
			{
				id: "Ficus",
				title: "Fig (Ficus)",
				description:
					"Ficus, the figs, is a large genus of trees found in warm regions around the world. Several species are planted in Australian cities as large shade trees.",
			},
			{
				id: "Washingtonia",
				title: "Fan palm (Washingtonia)",
				description:
					"Washingtonia palms come from the south-western United States and Mexico and have large fan-shaped leaves. They are widely planted along streets in warm climates.",
			},
			{
				id: "Callistemon",
				title: "Bottlebrush (Callistemon)",
				description:
					"Bottlebrushes are Australian shrubs and small trees named for their bottle-brush shaped flowers. They are popular street and garden plants.",
			},
		],
		treeTypeInfoTitle: "Tree profile",
	},
	filter: {
		title: "Filter",
		myAdoptedTrees: "My adopted trees",
		allAdoptedTrees: "Adopted trees",
		lastWateredTrees: "Previously watered trees",
		treeAge: "Tree age",
		show: "Show",
		reset: "Reset",
		treeAgeTitle: "Tree age",
		years: "years",
	},
	common: {
		defaultErrorMessage: "Something went wrong! Please try again later.",
		savedButNotRefreshed:
			"Your change was saved, but the screen could not be updated. Reload the page to see it.",
		appFailed: "Something went wrong. Please reload the page.",
		reload: "Reload",
	},
	splash: {
		headline: `Young trees in ${city.areaName} need your help through hot, dry summers.`,
		subheadlineWinter: `The watering season runs ${formatMonthRange(getSeasonMonths().season)}. Until then, the trees do not need extra water.
**Come back when the weather warms up!**`,
		subheadline:
			"Find out which trees in your neighbourhood are thirsty, adopt the tree on your doorstep and log your waterings.",
		actionTitle: "Let's go",
		actionTitleWinter: "Explore!",
		discoverTitle: "Discover",
		discoverContent:
			"The map shows the councils' public trees with their species, age and water needs. Use the filter and search to get an overview.",
		waterTitle: "Water",
		waterContent:
			"Grab a watering can, help a thirsty young tree and log how many litres you gave it.",
		adoptTitle: "Adopt",
		adoptContent:
			"By adopting a tree you keep track of it in your profile and let others know it is being looked after.",
		acknowledgement: acknowledgementOfCountry,
		letsGo: "Let's go",
	},
	loading: {
		mapLoading: "We are currently loading the trees.",
		treeLoading: "Loading tree information...",
		profileLoading: "Loading...",
	},
};
