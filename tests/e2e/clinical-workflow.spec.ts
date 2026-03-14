import { expect, test } from "@playwright/test";

test.describe("critical journey coverage", () => {
  test("scheduling and portal routes enforce authentication", async ({ page }) => {
    await page.goto("/patient/appointments");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/patient/records");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("provider encounter and notes routes are reachable for authenticated user", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    if (!email || !password) {
      test.skip(
        true,
        "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run authenticated critical journeys.",
      );
      return;
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/provider");
    await expect(page.getByText("Provider Dashboard Queue")).toBeVisible();

    await page.goto("/encounters/00000000-0000-0000-0000-000000000000/video");
    await expect(page.getByText("Unable to join consultation")).toBeVisible();

    await page.goto("/provider/notes/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("Encounter unavailable")).toBeVisible();
  });
});
