import { expect } from "@playwright/test";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import { testWithRegisteredUser } from "../fixtures/test-with-registered-user";
import { testWithUnregisteredAccount } from "../fixtures/test-with-unregistered-account";
import { waitForEmailLink } from "../mailpit";
import { waitForStoredSession } from "../session";

testWithUnregisteredAccount.describe("Register - Happy Case", () => {
	testWithUnregisteredAccount(
		"should be able to register then logout",
		async ({ page, newAccount }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(newAccount.email);
			await page.getByLabel("Email").press("Tab");

			await page.getByLabel("Username").fill(newAccount.username);
			await page.getByLabel("Username").press("Tab");

			await page.getByLabel("Password").fill(newAccount.password);
			await page.getByLabel("Password").press("Enter");

			await expect(page.locator("#register-alert-dialog")).toBeVisible();
			await page.getByRole("button", { name: "OK" }).click();
			await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();

			// Confirm the address by following the link from the mail sent to this
			// account, read through the Mailpit API.
			await page.goto(
				await waitForEmailLink({
					email: newAccount.email,
					subject: "Confirm your email address",
				}),
			);

			// The app writes the session from the URL hash asynchronously.
			await waitForStoredSession(page, { email: newAccount.email });

			await page.goto(`/profile`);
			await expect(
				page.getByRole("heading", { name: "Your profile" }),
			).toBeVisible();

			await page.getByRole("button", { name: "Log out" }).click();
			await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
		},
	);
});

testWithoutSplashScreen.describe("Register - Client-Side Validation", () => {
	testWithoutSplashScreen(
		"should not be able to register with empty e-mail",
		async ({ page }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(" ");
			await page.getByLabel("Email").press("Backspace");
			await page.getByLabel("Email").press("Tab");

			await expect(page.locator("input#email:invalid")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should not be able to register with invalid e-mail format",
		async ({ page }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill("invalid-email");
			await expect(page.locator("input#email:invalid")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should not be able to register with empty username",
		async ({ page }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Username").fill(" ");
			await page.getByLabel("Username").press("Backspace");

			await expect(page.locator("input#username:invalid")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should not be able to register with invalid username format",
		async ({ page }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Username").fill("a"); // too short
			await expect(page.locator("input#username:invalid")).toBeVisible();
			await expect(
				page.getByText("•be at least 3-50 characters long"),
			).toBeVisible();

			await page.getByLabel("Username").fill("a".repeat(51)); // too long
			await expect(page.locator("input#username:invalid")).toBeVisible();
			await expect(
				page.getByText("•be at least 3-50 characters long"),
			).toBeVisible();

			await page.getByLabel("Username").fill("invalid-username"); // no special characters
			await expect(page.locator("input#username:invalid")).toBeVisible();
			await expect(
				page.getByText("•and consist only of letters or"),
			).toBeVisible();

			await page.getByLabel("Username").fill("validUsername01");
			await expect(page.locator("input#username:invalid")).not.toBeVisible();
			await expect(
				page.getByText("✓be at least 3-50 characters long"),
			).toBeVisible();
			await expect(
				page.getByText("✓and consist only of letters or"),
			).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should not be able to register with empty password",
		async ({ page }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Password").fill(" ");
			await page.getByLabel("Password").press("Backspace");

			await expect(page.locator("input#password:invalid")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should not be able to register with invalid password format",
		async ({ page }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Password").fill("a1Q!"); // too short
			await expect(page.locator("input#password:invalid")).toBeVisible();
			await expect(page.getByText("•at least 8 characters")).toBeVisible();

			await page.getByLabel("Password").fill("1QQQQQQQ!"); // no lower case
			await expect(page.locator("input#password:invalid")).toBeVisible();
			await expect(
				page.getByText("•upper and lower case letters"),
			).toBeVisible();

			await page.getByLabel("Password").fill("aaaaaaa1!"); // no upper case
			await expect(page.locator("input#password:invalid")).toBeVisible();
			await expect(
				page.getByText("•upper and lower case letters"),
			).toBeVisible();

			await page.getByLabel("Password").fill("a1QQQQQQQ"); // no special characters
			await expect(page.locator("input#password:invalid")).toBeVisible();
			await expect(
				page.getByText("•at least one special character"),
			).toBeVisible();

			await page.getByLabel("Password").fill("aQQQQQQQ!"); // no number
			await expect(page.locator("input#password:invalid")).toBeVisible();
			await expect(page.getByText("•at least one number")).toBeVisible();

			await page.getByLabel("Password").fill("VALID-password-01");
			await expect(page.locator("input#password:invalid")).not.toBeVisible();
			await expect(page.getByText("✓at least 8 characters")).toBeVisible();
			await expect(
				page.getByText("✓upper and lower case letters"),
			).toBeVisible();
			await expect(
				page.getByText("✓at least one special character"),
			).toBeVisible();
			await expect(page.getByText("✓at least one number")).toBeVisible();
		},
	);
});

testWithRegisteredUser.describe("Register - Server-Side Validation", () => {
	testWithRegisteredUser(
		"should not be able to register with already registered e-mail",
		async ({ page, account }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(account.email);
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Username").fill(`${account.username}other`);
			await page.getByLabel("Username").press("Tab");
			await page.getByLabel("Password").fill(account.password);
			await page.getByLabel("Password").press("Enter");

			await expect(
				page.getByText("An account with this email already exists"),
			).toBeVisible();
		},
	);

	testWithRegisteredUser(
		"should not be able to register with already registered username",
		async ({ page, account }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(account.email);
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Username").fill(account.username);
			await page.getByLabel("Username").press("Tab");

			await expect(
				page.getByText("This username is already taken"),
			).toBeVisible();
		},
	);
});

testWithUnregisteredAccount.describe("Register - Error Handling", () => {
	testWithUnregisteredAccount(
		"should show error toast when and unexpected error occurs",
		async ({ page, newAccount }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "Register now" }).click();

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(newAccount.email);
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Username").fill(newAccount.username);
			await page.getByLabel("Username").press("Tab");
			await page.getByLabel("Password").fill(newAccount.password);

			await page.context().setOffline(true);

			await page.getByRole("button", { name: "Register", exact: true }).click();

			await expect(page.getByText("Something went wrong!")).toBeVisible();
		},
	);
});
