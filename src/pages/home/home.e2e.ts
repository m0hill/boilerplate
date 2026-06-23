import { expect, test } from "@playwright/test"

test.describe("home / repo lookup", () => {
  test("renders the form and the client island clock ticks", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Boilerplate" })).toBeVisible()
    await expect(page.locator("#stars")).toHaveText("—")

    await expect(page.locator("#clock")).not.toHaveText("—")
  })

  test("shows a validation error for a malformed repo via an SSE patch", async ({ page }) => {
    await page.goto("/")

    await page.getByLabel("Repository").fill("not-a-repo")
    await page.getByRole("button", { name: "Look up stars" }).click()

    await expect(page.locator("#repo-error")).toBeVisible()
    await expect(page.locator("#repo-error")).toContainText("owner/repo format")
    await expect(page.locator("#stars")).toHaveText("—")
  })
})
