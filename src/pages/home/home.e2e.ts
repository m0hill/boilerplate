import { expect, test } from "@playwright/test"

test.describe("home index", () => {
  test("lists the demos and navigates into one", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Boilerplate" })).toBeVisible()
    await expect(page.getByRole("link", { name: /KV counter/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /External API/ })).toBeVisible()

    await page.getByRole("link", { name: /KV counter/ }).click()
    await expect(page.getByRole("heading", { name: "KV counter" })).toBeVisible()
  })
})
