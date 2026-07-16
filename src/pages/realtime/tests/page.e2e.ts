import { expect, test } from "@playwright/test"

test.describe("Realtime counter", () => {
  test("converges two pages after either page increments", async ({ page, context }) => {
    const firstPage = page
    const secondPage = await context.newPage()
    await Promise.all([firstPage.goto("/realtime"), secondPage.goto("/realtime")])
    const firstCount = firstPage.locator("#realtime-count")
    const secondCount = secondPage.locator("#realtime-count")
    await expect(firstCount).toHaveText("0")
    await expect(secondCount).toHaveText("0")

    await firstPage.getByRole("button", { name: "Increment" }).click()
    await expect(firstCount).toHaveText("1")
    await expect(secondCount).toHaveText("1")

    await secondPage.getByRole("button", { name: "Increment" }).click()
    await expect(firstCount).toHaveText("2")
    await expect(secondCount).toHaveText("2")
  })
})
