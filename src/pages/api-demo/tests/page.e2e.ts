import { expect, test } from "@playwright/test"

test.describe("external API demo", () => {
  test("shows a validation error for a malformed repo via an SSE patch", async ({ page }) => {
    await page.goto("/api")

    await page.getByLabel("Repository").fill("not-a-repo")
    await page.getByRole("button", { name: "Look up" }).click()

    await expect(page.locator("#repo-error")).toBeVisible()
    await expect(page.locator("#repo-error")).toContainText("owner/repo format")
  })

  test("shows a busy state on the trigger while the lookup is in flight", async ({ page }) => {
    await page.route("**/api/lookup", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      await route.continue()
    })

    await page.goto("/api")

    const button = page.getByRole("button", { name: "Look up" })

    await page.getByLabel("Repository").fill("not-a-repo")
    await button.click()

    await expect(button).toHaveAttribute("aria-busy", "true")
    await expect(button).toHaveCSS("pointer-events", "none")

    await expect(page.locator("#repo-error")).toBeVisible()
    await expect(button).not.toHaveAttribute("aria-busy", "true")
  })
})
