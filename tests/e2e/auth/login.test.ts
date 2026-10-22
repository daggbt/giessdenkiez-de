import { expect } from "@playwright/test";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import { testWithRegisteredUser } from "../fixtures/test-with-registered-user";

testWithRegisteredUser.describe("Login - Happy Case", () => {
	testWithRegisteredUser(
		"should be able to log-in then log-out",
		async ({ page, account }) => {
			await page.goto(`/map`);

			// Go to profile
			await page.getByRole("link", { name: "Profile" }).click();

			// Login with the account created by the fixture
			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(account.email);
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Password").fill(account.password);
			await page.getByLabel("Password").press("Enter");

			await expect(page.getByText("Your profileYour overview")).toBeVisible();

			// Logout
			await page.getByRole("button", { name: "Log out" }).click();
			await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
		},
	);
});

testWithoutSplashScreen.describe("Login - Client-Side Validation", () => {
	testWithoutSplashScreen(
		"should not be able to log-in with empty email",
		async ({ page }) => {
			await page.goto(`/profile`);

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(" ");
			await page.getByLabel("Email").press("Backspace");
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Password").fill("123");
			await page.getByLabel("Password").press("Enter");

			await expect(page.locator("input#email:invalid")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should not be able to log-in with invalid email format",
		async ({ page }) => {
			await page.goto(`/profile`);

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill("invalid-email");
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Password").fill("123");
			await page.getByLabel("Password").press("Enter");

			await expect(page.locator("input#email:invalid")).toBeVisible();
		},
	);

	testWithoutSplashScreen(
		"should not be able to log-in with empty password",
		async ({ page }) => {
			await page.goto(`/profile`);

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill("invalid-email");
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Password").fill(" ");
			await page.getByLabel("Password").press("Backspace");
			await page.getByLabel("Password").press("Enter");

			await expect(page.locator("input#password:invalid")).toBeVisible();
		},
	);
});

testWithoutSplashScreen.describe("Login - Server-Side Validation", () => {
	testWithoutSplashScreen(
		"should not be able to log-in with wrong email/password credentials",
		async ({ page }) => {
			await page.goto(`/profile`);

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill("email-with-no-account@example.com");
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Password").fill("invalid-password");
			await page.getByLabel("Password").press("Enter");
			await expect(
				page
					.locator("div")
					.filter({ hasText: /^Invalid credentials$/ })
					.nth(2),
			).toBeVisible();
		},
	);
});

testWithRegisteredUser.describe("Login - Error Handling", () => {
	testWithRegisteredUser(
		"should show error toast when and unexpected error occurs",
		async ({ page, account }) => {
			await page.goto(`/profile`);

			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(account.email);
			await page.getByLabel("Email").press("Tab");
			await page.getByLabel("Password").fill(account.password);

			await page.context().setOffline(true);

			await page.getByRole("button", { name: "Login" }).click();

			await expect(page.getByText("Something went wrong!")).toBeVisible();
		},
	);
});
