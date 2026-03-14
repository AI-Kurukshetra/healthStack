import { expect, test } from "@playwright/test";

test.describe("auth flows", () => {
  test("register form is reachable and validates mismatched passwords", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill("new-user@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Repeat Password").fill("password999");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("login page is reachable and has the expected auth controls", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("signed-out users are redirected to login for protected dashboard routes", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("authenticated users can logout and return to login", async ({ page }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    if (!email || !password) {
      test.skip(
        true,
        "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run logout flow.",
      );
      return;
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
