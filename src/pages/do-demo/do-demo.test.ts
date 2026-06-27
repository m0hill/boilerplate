import { describe, expect, it } from "vitest"
import { datastarPost, loadApp, request } from "../../test-utils.js"

describe("Durable Object demo page", () => {
  it("defaults to the lobby room", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/do"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">Durable Object</h1>")
    expect(html).toContain("#lobby")
  })

  it("renders an empty room", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/do?room=test-empty"))
    const html = await response.text()

    expect(html).toContain("#test-empty")
    expect(html).toContain("No messages in this room yet.")
  })

  it("posts a message and patches the log", async () => {
    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/do/post", { room: "test-post", author: "alice", body: "hello DO" }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain("alice")
    expect(body).toContain("hello DO")
  })

  it("persists a room's messages across requests", async () => {
    const app = await loadApp()
    await app.fetch(
      datastarPost("/do/post", { room: "test-persist", author: "bob", body: "still here" }),
    )

    const response = await app.fetch(request("/do?room=test-persist"))
    const html = await response.text()

    expect(html).toContain("bob")
    expect(html).toContain("still here")
  })

  it("keeps rooms isolated — one DO instance per room", async () => {
    const app = await loadApp()
    await app.fetch(
      datastarPost("/do/post", { room: "test-room-a", author: "carol", body: "secret" }),
    )

    const response = await app.fetch(request("/do?room=test-room-b"))
    const html = await response.text()

    expect(html).toContain("No messages in this room yet.")
    expect(html).not.toContain("secret")
  })

  it("rejects an empty message with a form error", async () => {
    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/do/post", { room: "test-validate", author: "alice", body: "" }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Write a message before posting.")
  })
})
