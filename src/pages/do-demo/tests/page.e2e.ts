import { expect, test } from "@playwright/test"

test.describe("Durable Object demo", () => {
  test("posts a message from the browser form", async ({ page }) => {
    const room = `e2e-${Date.now()}`

    await page.goto(`/do?room=${room}`)
    await page.getByPlaceholder("Your name").fill("alice")
    await page.getByPlaceholder(`Message #${room}`).fill("hello from browser")
    await page.getByRole("button", { name: "Post" }).click()

    await expect(page.locator("#do-error")).toBeHidden()
    await expect(page.locator("#do-messages")).toContainText("alice")
    await expect(page.locator("#do-messages")).toContainText("hello from browser")
  })

  test("syncs a posted message to another open tab in real time", async ({ browser }) => {
    const room = `e2e-live-${Date.now()}`

    const sender = await browser.newPage()
    const watcher = await browser.newPage()

    await sender.goto(`/do?room=${room}`)
    await watcher.goto(`/do?room=${room}`)

    await sender.getByPlaceholder("Your name").fill("alice")
    await sender.getByPlaceholder(`Message #${room}`).fill("live broadcast")
    await sender.getByRole("button", { name: "Post" }).click()

    // The watcher never posted — it should receive the message over the live SSE stream.
    await expect(watcher.locator("#do-messages")).toContainText("alice")
    await expect(watcher.locator("#do-messages")).toContainText("live broadcast")

    await sender.close()
    await watcher.close()
  })
})
