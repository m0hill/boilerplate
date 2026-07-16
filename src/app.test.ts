import { describe, expect, it } from "vitest"
import { loadApp, request } from "@/test/utils"

describe("app seam", () => {
  it("serves a retained route through the Node application", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/design"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain(">Design system</h1>")
  })
})
