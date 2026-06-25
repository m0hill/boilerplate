import { expect, test } from "@playwright/test"

test.describe("external API demo", () => {
  test("shows a validation error for a malformed repo via an SSE patch", async ({ page }) => {
    await page.goto("/api")

    await page.getByLabel("Repository").fill("not-a-repo")
    await page.getByRole("button", { name: "Look up" }).click()

    await expect(page.locator("#repo-error")).toBeVisible()
    await expect(page.locator("#repo-error")).toContainText("owner/repo format")
  })
})
