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
})
