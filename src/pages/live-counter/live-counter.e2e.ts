import { expect, test } from "@playwright/test"

test.describe("Live counter demo", () => {
  test("syncs an increment to another open tab in real time", async ({ browser }) => {
    const sender = await browser.newPage()
    const watcher = await browser.newPage()

    await sender.goto("/live-counter")
    await watcher.goto("/live-counter")

    const before = Number((await watcher.locator("#live-count").textContent())?.replace(/\D/g, ""))

    await sender.getByRole("button", { name: "Increment" }).click()

    await expect(watcher.locator("#live-count")).toHaveText(String(before + 1))

    await sender.close()
    await watcher.close()
  })
})
