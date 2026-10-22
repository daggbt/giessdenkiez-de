import { expect } from "@playwright/test";
import { testWithoutSplashScreen } from "../fixtures/test-without-splash-screen";
import { testWithRegisteredUser } from "../fixtures/test-with-registered-user";
import { waitForEmailLink } from "../mailpit";

testWithRegisteredUser.describe("Forgot password - Happy Case", () => {
	testWithRegisteredUser(
		"should be able to reset password via e-mail",
		async ({ page, account }) => {
			await page.goto(`/profile`);
			await page.getByRole("link", { name: "forget your password?" }).click();
			await page.getByLabel("Email").click();
			await page.getByLabel("Email").fill(account.email);
			await page.getByLabel("Email").press("Enter");

			await page.goto(
				await waitForEmailLink({
					email: account.email,
					subject: "Reset your password",
				}),
			);

			await page.getByLabel("New password").click();
			await page.getByLabel("New password").fill(account.password);

			await page.getByRole("button", { name: "Save" }).click();

			await expect(page.locator("#password-reset-alert-dialog")).toBeVisible();
			await page.getByRole("button", { name: "OK" }).click();

			await expect(
				page.getByRole("heading", { name: "Your profile" }),
			).toBeVisible();

			await page.getByRole("button", { name: "Log out" }).click();
			await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
		},
	);
});

testWithoutSplashScreen.describe(
	"Forgot password - Client-Side Validation",
	() => {
		testWithoutSplashScreen(
			"should not be able to reset password with empty email",
			async ({ page }) => {
				await page.goto(`/profile`);
				await page.getByRole("link", { name: "forget your password?" }).click();

				await page.getByLabel("Email").click();
				await page.getByLabel("Email").fill(" ");
				await page.getByLabel("Email").press("Backspace");

				await expect(page.locator("input#email:invalid")).toBeVisible();
			},
		);

		testWithoutSplashScreen(
			"should not be able to reset password with invalid email format",
			async ({ page }) => {
				await page.goto(`/profile`);
				await page.getByRole("link", { name: "forget your password?" }).click();

				await page.getByLabel("Email").click();
				await page.getByLabel("Email").fill("invalid-email");

				await expect(page.locator("input#email:invalid")).toBeVisible();
			},
		);

		testWithoutSplashScreen(
			'should not be able to reset password by going on "profile/reset-password" directly',
			async ({ page }) => {
				await page.goto(`/profile/reset-password`);

				await expect(page.getByText("Please wait a moment...")).toBeVisible();

				await expect(page.getByText("An error occurred.")).toBeVisible({
					timeout: 15000,
				});
				await expect(page.getByText("Note: This page can only")).toBeVisible();
				await page.getByRole("button", { name: "Back to home" }).click();
				await expect(page).toHaveURL(new RegExp(`/map.*`));
			},
		);
	},
);

testWithoutSplashScreen.describe(
	"Forgot password - Error Handling - Forgot password page",
	() => {
		testWithoutSplashScreen(
			"should show error toast when and unexpected error occurs during forgot-password",
			async ({ page }) => {
				await page.goto(`/profile`);
				await page.getByRole("link", { name: "forget your password?" }).click();

				await page.getByLabel("Email").click();
				await page.getByLabel("Email").fill("someone@example.com");

				await page.context().setOffline(true);

				await page.getByRole("button", { name: "Reset password" }).click();

				await expect(page.getByText("Something went wrong!")).toBeVisible();
			},
		);
	},
);

testWithRegisteredUser.describe(
	"Forgot password - Error Handling - Reset password page",
	() => {
		testWithRegisteredUser(
			"should show error toast when and unexpected error occurs during reset password",
			async ({ page, account }) => {
				await page.goto(`/profile`);
				await page.getByRole("link", { name: "forget your password?" }).click();
				await page.getByLabel("Email").click();
				await page.getByLabel("Email").fill(account.email);
				await page.getByLabel("Email").press("Enter");

				await page.goto(
					await waitForEmailLink({
						email: account.email,
						subject: "Reset your password",
					}),
				);

				await page.getByLabel("New password").fill('123qwe!"§QWE');

				await page.context().setOffline(true);

				await page.getByRole("button", { name: "Save" }).click();

				await expect(
					page
						.locator("div")
						.filter({
							hasText: /^Something went wrong! Please try again later\.$/,
						})
						.nth(2),
				).toBeVisible();
			},
		);
	},
);
