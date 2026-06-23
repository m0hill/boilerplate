import { expect, test } from "@playwright/test"

test.describe("home / repo compare", () => {
  test("renders the form and empty compare board", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Boilerplate" })).toBeVisible()
    await expect(page.locator("#stars")).toHaveText("—")
    await expect(page.locator("#compare-board")).toContainText(
      "No repositories on the compare board yet.",
    )
  })

  test("shows a validation error for a malformed repo via an SSE patch", async ({ page }) => {
    await page.goto("/")

    await page.getByLabel("Repository").fill("not-a-repo")
    await page.getByRole("button", { name: "Look up repo" }).click()

    await expect(page.locator("#repo-error")).toBeVisible()
    await expect(page.locator("#repo-error")).toContainText("owner/repo format")
    await expect(page.locator("#stars")).toHaveText("—")
  })
})
