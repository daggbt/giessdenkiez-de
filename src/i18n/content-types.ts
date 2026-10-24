import type { Council } from "../config/councils";

interface TreeTypeInfo {
	/** The genus as in the `genus` column of the trees table, e.g. "Platanus". */
	id: string;
	title: string;
	description: string;
}

interface LocationSearch {
	placeholder: string;
}

interface Legend {
	title: string;
	greenTrees: string;
	yellowTrees: string;
	orangeTrees: string;
	grayTrees: string;
	/** Below the colours while none is picked. */
	pickColorHint: string;
	/** Below the colours while one is picked. */
	unpickColorHint: string;
	/** Instead of the hint when a picked colour has no trees, by reason. */
	noTrees: {
		offSeason: string;
		filters: string;
		none: string;
	};
}

interface Navbar {
	map: string;
	profile: {
		sidebarLabel: string;
		title: string;
		overview: {
			subtitle: string;
			irrigations: string;
			liter: string;
			adoptedTrees: string;
		};
		adoptedTrees: {
			subtitle: string;
			irrigationTimes: (count: number) => string;
			irrigationAmount: string;
			showAll: string;
			showLess: string;
			noAdoptedTreesMessage: string;
		};
		settings: {
			subtitle: string;
			username: string;
			yourUsername: string;
			editUsername: string;
			placeholderUser: string;
			email: string;
			yourEmail: string;
			editEmail: string;
			placeholderMail: string;
			updateEmailEmailSentTitle: string;
			updateEmailEmailSentMessage: string;
			password: string;
			changePassword: string;
			newPassword: string;
			passwordChangeConfirmationTitle: string;
			passwordChangeConfirmationMessage: string;
			passwordChangeWithoutRecoveryLinkTitle: string;
			passwordChangeWithoutRecoveryLinkMessage: string;
			passwordChangeWithoutRecoveryLinkLinkLabel: string;
			pleaseWait: string;
			deleteAccount: string;
			confirmDelete: string;
			cancel: string;
			approve: string;
			usernameShould: string;
			checkInput: string;
			usernameLength: string;
			onlyNumberAndLetters: string;
			usernameTaken: string;
			emailTaken: string;
			backToLogin: string;
			register: string;
			confirmEmailTitle: string;
			confirmEmail: (email: string) => string;
			existingAccount: string;
			logIn: string;
			passwordShould: string;
			passwordLength: string;
			passwordUpperAndLowerCase: string;
			passwordSpecialChar: string;
			passwordNumber: string;
			logInShort: string;
			missingAccount: string;
			registerNow: string;
			forgotYourPassword: string;
			ohNoforgotYourPassword: string;
			passwordForgotten: string;
			resetPasswordEmailSentTitle: string;
			resetPasswordEmailSentMessage: string;
			clickHere: string;
			resetPassword: string;
			invalidCredentials: string;
			deleteAccountConfirm: string;
			confirm: string;
			usernamePublicNotice: string;
			save: string;
		};
		logOut: string;
		showPassword: string;
		hidePassword: string;
	};
	info: string;
}

interface NotFound {
	title: string;
}

interface QuestionAnswer {
	question: string;
	answer: string;
}

interface QuestionAnswerHead {
	question: string;
	answer: string;
	aboutUsTitle: string;
	aboutUsAnswer: string;
	acknowledgementTitle: string;
	acknowledgement: string;
	privacyTitle: string;
	privacy: string;
}

interface Info {
	infoTitel: string;
	about: {
		head: QuestionAnswerHead;
		qa: QuestionAnswer[];
	};
	faq: {
		title: string;
		description: string;
		qa: QuestionAnswer[];
	};
	share: {
		title: string;
		content: string;
		openSource: string;
	};
	credits: {
		builtOn: string;
		data: string;
	};
}

interface WaterNeed {
	title: string;
	hintOffSeason: (seasonMonths: string) => string;
	hint: string;
	needXLiters: (liters: string) => string;
	waterManagedBaby: string;
	waterManagedSenior: string;
	offSeasonTitle: string;
	unknownTitle: string;
	unknownShort: string;
	liters: string;
	watered: string;
	rained: string;
	stillMissing: string;
	dataOfLastXDays: string;
	weatherUnavailable: string;
	/** Legend label of the part of the ring covered by the council (young trees). */
	coveredByCity: string;
	/** Legend label of the part of the ring for established trees. */
	coveredEstablished: string;
	alreadyWateredByManager: (councilName: string) => string;
	alreadyWateredByEstablished: string;
	offSeasonRing: string;
	stillWaterXLiters: (liters: string) => string;
	sufficientlyWatered: string;
	ageAndWaterHint: (council: Council, needsHelpMaxYears: number) => string;
	ageAndWaterHintOffSeason: (
		seasonMonths: string,
		offSeasonMonths: string,
	) => string;
	readMore: string;
	close: string;
	iWatered: string;
	loginToWater: {
		login: string;
		toWater: string;
	};
	submitWatering: string;
	wateredHowMuch: string;
	wateredHowMuchPlaceholder: string;
	wateredWhen: string;
	waterSave: string;
	waterCancel: string;
	wateringSuccessful: string;
	wateringFailed: string;
}

interface Problem {
	title: string;
	description: (councilName: string) => string;
	link: (councilName: string) => string;
}

interface LastWaterings {
	deletedAccount: string;
	title: string;
	last30Days: string;
	nothingLast30Days: string;
	before: string;
	nothingBefore: string;
	delete: string;
}

interface TreeDetail {
	title: string;
	adoptIt: string;
	alsoAdoptedByOtherUsers: string;
	onlyAdoptedByOtherUsers: string;
	adoptLoading: string;
	unadoptLoading: string;
	isAdopted: string;
	ageTitle: string;
	planted: {
		day: (date: string, ago: string) => string;
		year: (year: string) => string;
		beforeInventory: string;
		unknown: string;
	};
	facts: {
		council: string;
		suburb: string;
		height: string;
		heightValue: (metres: string) => string;
		family: string;
		rare: string;
		heritage: string;
		significant: string;
		significantGroup: string;
	};
	status: {
		thirsty: (litres: string) => string;
		partial: (litres: string) => string;
		satisfied: string;
		councilCare: (councilName: string) => string;
		established: string;
		unknownAge: string;
		offSeason: (seasonMonths: string) => string;
	};
	adoptHintTitle: string;
	adoptHint: string;
	adoptErrorMessage: string;
	adoptLoginFirst: string;
	treeTypeUnknown: string;
	waterNeed: WaterNeed;
	lastWaterings: LastWaterings;
	problem: Problem;
	managedBy: (councilName: string, councilCareMaxYears: number) => string;
	treeTypeInfos: TreeTypeInfo[];
	treeTypeInfoTitle: string;
}

interface Filter {
	title: string;
	myAdoptedTrees: string;
	allAdoptedTrees: string;
	lastWateredTrees: string;
	treeAge: string;
	show: string;
	reset: string;
	treeAgeTitle: string;
	years: string;
}

interface Common {
	defaultErrorMessage: string;
	savedButNotRefreshed: string;
	appFailed: string;
	reload: string;
}

interface Splash {
	headline: string;
	subheadline: string;
	subheadlineWinter: string;
	actionTitle: string;
	actionTitleWinter: string;
	discoverTitle: string;
	discoverContent: string;
	waterTitle: string;
	waterContent: string;
	adoptTitle: string;
	adoptContent: string;
	acknowledgement: string;
	letsGo: string;
}

interface Loading {
	mapLoading: string;
	treeLoading: string;
	profileLoading: string;
}

export interface Content {
	common: Common;
	map: {
		attribution: {
			mapbox: {
				href: string;
				label: string;
			};
			openStreetMap: {
				href: string;
				label: string;
			};
			treeData: {
				href: string;
				label: string;
			};
			weather: {
				href: string;
				label: string;
			};
			improve: {
				href: string;
				label: string;
			};
			privacy: {
				href: string;
				label: string;
			};
		};
		unavailable: {
			unsupported: string;
			failed: string;
		};
	};
	locationSearch: LocationSearch;
	legend: Legend;
	navbar: Navbar;
	notFound: NotFound;
	info: Info;
	treeDetail: TreeDetail;
	filter: Filter;
	splash: Splash;
	loading: Loading;
}
