import { city } from "../config/city";
import { Content } from "./content-types";

export const en: Content = {
	banner: {
		textBefore:
			"Want to meet other community members? Then come to the community meetup on Aug 25 in Berlin Friedrichshain-Kreuzberg from 5 to 7 pm. Find out more about the programme  ",
		programLink: {
			label: "here",
			href: "https://citylab-berlin.org/en/events/giess-den-kiez-community-event/",
		},
		textAfter: ".",
	},
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
			treeData: {
				href: city.dataAttribution.url,
				label: city.dataAttribution.text,
			},
			weather: {
				href: "https://open-meteo.com/",
				label: "Weather data by Open-Meteo.com",
			},
			improve: {
				href: "https://www.mapbox.com/map-feedback",
				label: "**Improve this map**",
			},
			feedback: {
				href: "https://citylabberlin.typeform.com/to/kCdnCgvC#product_id=GdK",
				label: "Feedback",
			},
			imprint: {
				href: "https://www.technologiestiftung-berlin.de/de/impressum/",
				label: "Imprint",
			},
			privacy: {
				href: "https://www.technologiestiftung-berlin.de/de/datenschutz/",
				label: "Privacy",
			},
		},
	},
	locationSearch: {
		placeholder: "Search for an address",
	},
	legend: {
		title: "Legend",
		greenTrees: "Fine for now, or watered by the City",
		yellowTrees: "Watered recently, needs more",
		orangeTrees: "Thirsty \u2014 needs water",
		grayTrees: "Filtered out",
	},
	navbar: {
		map: "Map",
		profile: {
			sidebarLabel: "Profile",
			title: "Your profile",
			overview: {
				subtitle: "Your overview",
				irrigations: "Waterings",
				liter: "Liters",
				adoptedTrees: "Adopted trees",
			},
			adoptedTrees: {
				subtitle: "Adopted trees",
				irrigationTimes: "Times",
				irrigationAmount: "Liters",
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
				placeholderMail: "xyz@ts.berlin",
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
				backToLogin: "Back to login",
				register: "Register",
				confirmEmailTitle: "Confirm account",
				confirmEmail: (email: string) =>
					`Check your inbox for "${email}", you should have received a mail from "no-reply@giessdenkiez.de" containing a link to activate your account.`,
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
				answer: `The consequences of climate change, especially the dry and hot summers, are putting a strain on Berlin's ecosystem. Our urban trees are drying out and suffering long-term damage: In recent years, more and more trees had to be felled and their lifespan is decreasing. The public is now regularly called upon for support, but in a so far uncoordinated manner. Through this project we want to improve this and enable coordinated citizen participation in the watering of urban green spaces.`,

				aboutUsTitle: "About Us",
				aboutUsAnswer: `“Gieß den Kiez” is a project of the [CityLAB Berlin](https://www.citylab-berlin.org/).
				The CityLAB is a public innovation laboratory in the former Berlin-Tempelhof airport. Together with a large network of administration, civil society, science and start-ups, we are working on new ideas to make Berlin even more liveable. The CityLAB is a project of the Technologiestiftung Berlin and is funded by the Berlin Senate Chancellery.`,
				press: `For press inquiries please contact [Pia Gralki](mailto:pia.gralki@ts.berlin?subject=giessdenkiez.de%20Presseanfrage).`,
				communityTitle: "Community",
				communityAnswer:
					"Would you like to find out more about watering trees, exchange ideas with other active users? Then join our Slack chat!",
				slackButton: "Go to Slack Community",
				feedback: `Do you have **feedback** on *Gieß den Kiez*?

[Feel free to answer a few questions](https://citylabberlin.typeform.com/to/kCdnCgvC#product_id=GdK)`,
			},
			qa: [
				{
					question: "Useful links",
					answer: `[Favorite Tree Initiative (Berlin)](https://www.lieblingsbaum-initiative.de)

[Watering in dry conditions (Baumpflegeportal)](https://www.baumpflegeportal.de/baumpflege/trockenheit-duerre-wann-baeume-giessen/)

[Berlin city tree campaign (SenMVKU)](https://www.berlin.de/senuvk/umwelt/stadtgruen/stadtbaeume/kampagne/start.shtml)

[Irrigation recommendation for urban trees (Berlin Plant Protection Office)](https://www.berlin.de/pflanzenschutzamt/stadtgruen/beratung/bewaesserungsempfehlung-fuer-stadtbaeume/)

[City trees - significance and challenges in times of climate change (HCU Hamburg)](https://www.hcu-hamburg.de/fileadmin/documents/REAP/files/Bildungsmaterial_Stadtbaeume_im_Klimawandel_2017.pdf)

[Functions of city trees (Nature Conservation Association)](https://www.bund-naturschutz.de/natur-und-landschaft/stadt-als-lebensraum/stadtbaeume/funktionen-von-stadtbaeumen.html)`,
				},
				{
					question: "Data sources",
					answer: `The map shows the majority of Berlin's street trees (962,545; as of Mai 2026). It also shows how much precipitation has fallen on each tree in the last 30 days and whether users have watered them. Unfortunately, for various reasons, not all of Berlin's urban trees are listed yet. However, we are working on improving the data situation. The current data sources are the following:

[Geoportal Berlin / Street trees](https://fbinter.stadt-berlin.de/fb/berlin/service_intern.jsp?id=s_wfs_baumbestand@senstadt&type=WFS)

[Geoportal Berlin / Plant trees](https://fbinter.stadt-berlin.de/fb/berlin/service_intern.jsp?id=s_wfs_baumbestand_an@senstadt&type=WFS)

Precipitation from [German Weather Service](https://www.dwd.de/)`,
				},
			],
		},
		faq: {
			title: "F.A.Q.",
			description:
				"Based on the active exchange in our Slack community as well as your feedback via email and telephone, we have created a small FAQ. The most frequently asked questions are answered here.",
			qa: [
				{
					question: "How can I participate?",
					answer: `Explore:

Curious which tree is in front of your door? Our interactive map visualizes over 900,000 street trees of Berlin. If you want to find out more about a tree, navigate and zoom to the desired location and click on the colored dot. You will now see a lot of information about the selected tree.

Watering and adopting trees:

Do you want to get active or are you already actively watering? On Gieß den Kiez, you can enter when and with how much water you watered a tree. Trees can also be adopted. The adopted trees appear in your own user profile and can be found more quickly. This allows other neighbors in the area to see which trees need their attention. To water and adopt trees, first create a profile with a valid email address and then log in.

Connect:

You can use our public [Slack channel](https://join.slack.com/t/giessdenkiez/shared_invite/zt-e3et281u-xON4UmBZpKavzDRkw5HmCQ) to exchange ideas with others, connect to jointly water your neighborhood.`,
				},
				{
					question: "What can I do if trees are not registered correctly?",
					answer: `We obtain the tree data set with all attributes such as address, tree species and planting year for each tree from the geoportal of the city of Berlin, the FIS broker. The tree register provided in the geoportal is based on the district-aggregated data from the road and green space authorities. It can therefore happen that data from trees is out of date or that properties differ from current reality. Unfortunately, we cannot make any changes to the tree register ourselves. Any deviations can only be reported directly to the responsible district authority. Once a year, the green space authorities publish an updated tree register, which we link to Gieß den Kiez after publication.`,
				},
				{
					question: "Why should I take action and water trees?",
					answer: `The long periods of drought and heat of the last two years have caused immense damage to Berlin's urban greenery. Between 2018 and 2019 alone, over 7,000 trees had to be felled, not solely due to drought damage.

The street and green space authorities are already watering thousands of trees, but cannot keep up with the watering during Berlin's hot summers. Since the green space authorities are organized by district, each district works slightly different, which makes holistic and needs-based coordination difficult. Through the platform, we would like to give citizens the opportunity to help trees specifically based on their current water supply and to obtain further information. The goal is to save as many trees as possible through neighborly involvement.`,
				},
				{
					question: "How do I water correctly?",
					answer: `
Trees require different amounts of water depending on their age, location and species. Young trees (0-10 years) in particular are dependent on frequent waterings in times of drought, radiation and heat. The district green space offices in Berlin typically take care of young trees up to the age of 5 years, which means that young trees between 5 and 10 years old require your attention.

Before watering, you should first look at the tree and consider whether it really needs water. Important indicators for need-based watering include the age (young/old), trunk circumference (thin/thick), location (sunny/shady), and the condition of fresh shoots (bare/green) of a tree. Before you start watering, we recommend loosening the dry soil so that the water can penetrate the ground instead of running off or pooling on the surface. Based on Berlin's [Good Care Manual](https://www.berlin.de/sen/uvk/natur-und-gruen/stadtgruen/pflegen-und-unterhalten/handbuch-gute-pflege), it is better to water less frequently but with larger amounts of water. The manual recommends up to 200 liters per watering for newly planted trees. This ensures that the soil moisture is also increased at depth. So-called watering bags are also recommended, from which the water only emerges very slowly, hardly runs off the surface and therefore seeps continuously into the soil.
					`,
				},
				{
					question: `How do I deal with water scarcity?`,
					answer: `In times of drought and water scarcity, it is especially important to use water sparingly. If you want to water your tree, first ask yourself which tree has the greatest need. Water less frequently, but with larger amounts of water. This encourages the tree to develop deeper roots and become more resilient to drought. To get an overview of the current soil moisture in Berlin, it is worth checking the [Irrigation recommendation for urban trees](https://www.berlin.de/pflanzenschutzamt/stadtgruen/beratung/bewaesserungsempfehlung-fuer-stadtbaeume/) of Berlin's Plant Protection Office. In the long term, it is worth collecting rainwater and storing it in rain barrels. Neighborhood initiatives like [Wassertanke](https://wassertanke.org) can help you with such community projects.`,
				},
				{
					question: "How are technical problems handled?",
					answer: `The participation platform “Gieß den Kiez” is a prototype and therefore a beta version of a web app. We are aware of some technical hurdles, but depend on your help. We are happy to receive your technical feedback and questions in our [Slack Channel](https://join.slack.com/t/giessdenkiez/shared_invite/zt-e3et281u-xON4UmBZpKavzDRkw5HmCQ) or by email. Anyone who feels at home in the “tech world” is welcome to participate in our [Open Source GitHub Repository](https://github.com/technologiestiftung/giessdenkiez-de) invited and can comment on his issues or code fixes directly in the repository.`,
				},
				{
					question: "Why is the website not loading or loading very slowly?",
					answer: `When the page is first opened, the browser loads over 900,000 data points - this can take a while! Regardless, there may be slightly different displays when using different browsers. For the best experience, we recommend using Chrome or Firefox Desktop. Experience has shown that the most common problems can be solved if the browser is not outdated or the latest version is installed and there is a stable internet connection (LAN or WLAN).

Use via smartphone (mobile network) can lead to performance problems (page loads slowly). If problems occur repeatedly, you can report them in our [Slack Channel](https://join.slack.com/t/giessdenkiez/shared_invite/zt-e3et281u-xON4UmBZpKavzDRkw5HmCQ), Report by email or via GitHub Issue, stating the device used, the operating system, the browser and the browser version.`,
				},
				{
					question: "What should I do if I watered a tree incorrectly?",
					answer: `To remove a watering entry first click on the tree for which you entered the watering. Scroll down the tree sidebar to the section of past waterings, click the trash can icon next to the entry you want to delete, and click “Delete” to confirm. Only waterings that you have made yourself can be deleted. After deleting, enter the watering with the correct information (number of liters and time) via the "I watered" button.`,
				},
				{
					question: "Can the principle be transferred to other cities?",
					answer: `The “Gieß den Kiez” platform is an open source software project and runs under an MIT license. Accordingly, the idea and also the source code can be used and further developed free of charge for implementation in other cities. If you are interested, please take a look at our [GitHub Repository](https://github.com/technologiestiftung/giessdenkiez-de) or contact us via email. We are also happy to support your city with the technical implementation via [DeineStadtgießt](https://deinestadt.giessdenkiez.de/).`,
				},
				{
					question: "I still have a question!",
					answer: `The FAQ couldn't help you or you have a more complex query? Then write us an [Email](mailto:giessdenkiez@citylab-berlin.org).`,
				},
				{
					question: "Why aren't all of Berlin's trees shown?",
					answer: `Gieß den Kiez is based on the tree register. The tree register is a city directory in which (city/street or park) trees are managed and which is provided by the street and green spaces authorities. However, the green space authorities are not responsible for all of Berlin's trees. The trees in the Plänterwald, for example, are subject to the forestry office. These trees therefore do not appear in Gieß den Kiez.`,
				},
			],
		},
		share: {
			title:
				"Share Gieß den Kiez with those around you and help us expand the watering community:",
			content:
				"On Gieß den Kiez you can find out about Berlin's tree population, find thirsty trees and record when you watered them!",
			openSource:
				"Gieß den Kiez is an [Open Source Project](https://github.com/technologiestiftung/giessdenkiez-de)!",
		},
		credits: {
			projectBy: "A project of",
			fundedBy: "Funded by",
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
			suburb: "Suburb",
			height: "Height",
			heightValue: (metres: string) => `${metres} m`,
			family: "Family",
			rare: "Rare species",
			heritage: "Heritage",
			significant: "Community significance",
			significantGroup: "Significant group",
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
		managedBy: (councilCareMaxYears: number) =>
			`The ${city.councilName} waters new trees for their first ${councilCareMaxYears} years, so this tree does not need your help yet.`,
		waterNeed: {
			title: "Water needs",
			hintOffSeason: (offSeasonMonths: string) =>
				`Outside the watering season (${offSeasonMonths}), rain usually covers the trees' needs.`,
			hint: "Depending on the age of the tree, the need for water varies.",
			needXLiters: (liters: string) =>
				`Needs ${liters} litres over 30 days (rain counts)`,
			waterManagedBaby: "Watered by the City",
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
			coveredByCity: "Watered by the City",
			coveredEstablished: "Established",
			alreadyWateredByManager: `Watered by the **${city.councilName}**`,
			alreadyWateredByEstablished: "**Established** tree",
			offSeasonRing: "No watering needed outside the season",
			stillWaterXLiters: (liters: string) => `
Needs

**${liters} litres**`,
			sufficientlyWatered: "Sufficiently watered at the moment",
			ageAndWaterHint: (
				councilCareMaxYears: number,
				needsHelpMaxYears: number,
			) => `
**Under ${councilCareMaxYears} years**: the ${city.councilName} waters new trees ([source: City of Perth Urban Forest FAQ](https://engage.perth.wa.gov.au/urban-forest-plan/faqs)).

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
			description: `Noticed damage or a problem with this tree? Report it to the ${city.councilName}.`,
			link: `Contact the ${city.councilName}`,
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
	},
	splash: {
		headline:
			"Berlin's city trees are suffering from drought and you can help them!",
		subheadlineWinter: `Currently the trees are practically in hibernation and don’t need any additional water.
**Starting in March, it will pick up again! We Can!**`,
		subheadline:
			"Find out about the water needs of the trees in your neighborhood, adopt the tree on your doorstep and become part of the active watering community in Berlin!",
		actionTitle: "Let's go",
		actionTitleWinter: "Explore!",
		discoverTitle: "Discover",
		discoverContent:
			"The map visualizes over 900,000 urban trees (as of 2025) and displays information on species, age and water requirements. Use the filter and search functions to quickly get an overview.",
		waterTitle: "Water",
		waterContent:
			"Grab a watering can and become part of the watering community! Over a thousand active people have already joined forces for Berlin's trees and are regularly submitting their waterings.",
		adoptTitle: "Adopt",
		adoptContent:
			"By adopting a tree - or several - you let your neighborhood know that these trees will be cared for. This creates a coordinated commitment.",
		networkTitle: "Connect",
		networkContent:
			"Join our Slack chat to connect with the watering community, exchange questions, and coordinate watering in your neighborhood.",
		questionHeadline: "Gieß den Kiez also in your city?",
		questionSubheadline:
			"Cities like Leipzig, Magdeburg and Co. have already successfully joined the watering wave! Is your city the next one?",
		discoverMoreTitle: "Learn more!",
		letsGo: "Let's go",
	},
	loading: {
		mapLoading: "We are currently loading the City of Perth's trees.",
		treeLoading: "Loading tree information...",
		profileLoading: "Loading...",
	},
};
