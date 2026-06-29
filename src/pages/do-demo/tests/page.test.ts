import { describe, expect, it } from "vitest"
import { datastarPost, loadApp, request } from "@/test/utils"

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

  it("accepts a post and only resets the form (the live stream renders the list)", async () => {
    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/do/post", { room: "test-post", author: "alice", body: "hello DO" }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).not.toContain("event: datastar-patch-elements")

    const page = await app.fetch(request("/do?room=test-post"))
    expect(await page.text()).toContain("hello DO")
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

  it("delivers a post to a subscriber that connected before the write", async () => {
    const app = await loadApp()
    const live = await app.fetch(request("/do/live?room=test-live"))

    expect(live.status).toBe(200)
    expect(live.headers.get("content-type")).toBe("text/event-stream")

    const body = live.body
    if (body === null) throw new Error("expected an SSE stream body")

    const reader = body.getReader()
    const decoder = new TextDecoder()

    const snapshot = decoder.decode((await reader.read()).value)
    expect(snapshot).toContain("event: datastar-patch-elements")

    await app.fetch(
      datastarPost("/do/post", { room: "test-live", author: "dana", body: "live ping" }),
    )

    let received = ""
    while (!received.includes("live ping")) {
      const { value, done } = await reader.read()
      if (done) break
      received += decoder.decode(value)
    }

    expect(received).toContain("event: datastar-patch-elements")
    expect(received).toContain("dana")
    expect(received).toContain("live ping")

    await reader.cancel()
  })

  it("converges concurrent posts without reverting the list", async () => {
    const app = await loadApp()
    const live = await app.fetch(request("/do/live?room=test-concurrent"))
    const body = live.body
    if (body === null) throw new Error("expected an SSE stream body")

    const reader = body.getReader()
    const decoder = new TextDecoder()
    await reader.read()

    await Promise.all([
      app.fetch(
        datastarPost("/do/post", { room: "test-concurrent", author: "amy", body: "first" }),
      ),
      app.fetch(
        datastarPost("/do/post", { room: "test-concurrent", author: "ben", body: "second" }),
      ),
    ])

    let received = ""
    while (!(received.includes("first") && received.includes("second"))) {
      const { value, done } = await reader.read()
      if (done) break
      received += decoder.decode(value)
    }

    expect(received).toContain("first")
    expect(received).toContain("second")
    await reader.cancel()

    const page = await app.fetch(request("/do?room=test-concurrent"))
    const html = await page.text()
    expect(html).toContain("amy")
    expect(html).toContain("ben")
  })

  it("keeps serving a room after a subscriber disconnects", async () => {
    const app = await loadApp()
    const live = await app.fetch(request("/do/live?room=test-cleanup"))
    const body = live.body
    if (body === null) throw new Error("expected an SSE stream body")

    const reader = body.getReader()
    await reader.read()
    await reader.cancel()
    await app.fetch(
      datastarPost("/do/post", { room: "test-cleanup", author: "cleo", body: "after disconnect" }),
    )
    const page = await app.fetch(request("/do?room=test-cleanup"))
    expect(await page.text()).toContain("after disconnect")
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
