import { expect, test } from "@playwright/test"

test.describe("SQLite counter", () => {
  test("increments through a Datastar round trip", async ({ page }) => {
    await page.goto("/sqlite")

    const count = page.locator("#sqlite-count")
    await expect(count).toHaveText("0")
    await page.getByRole("button", { name: "Increment" }).click()
    await expect(count).toHaveText("1")
  })
})
