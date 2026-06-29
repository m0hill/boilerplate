import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it } from "vitest"
import { datastarPost, loadApp, request } from "../../../test/utils.js"

const clearBucket = async () => {
  const listed = await env.APP_BUCKET.list()
  await Promise.all(listed.objects.map((object) => env.APP_BUCKET.delete(object.key)))
}

beforeEach(clearBucket)

describe("R2 demo page", () => {
  it("renders an empty bucket", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/r2"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">R2 object store</h1>")
    expect(html).toContain("The bucket is empty. Save an object above.")
  })

  it("stores an object and patches the listing", async () => {
    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/r2/put", { key: "notes/a.txt", content: "hello" }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain("notes/a.txt")
    expect(body).toContain("5 B")
  })

  it("persists the object across requests", async () => {
    const app = await loadApp()
    await app.fetch(datastarPost("/r2/put", { key: "notes/a.txt", content: "hello" }))

    const response = await app.fetch(request("/r2"))
    const html = await response.text()

    expect(html).toContain("notes/a.txt")
    expect(html).not.toContain("The bucket is empty")
  })

  it("serves a stored object's body", async () => {
    const app = await loadApp()
    await app.fetch(datastarPost("/r2/put", { key: "notes/a.txt", content: "hello world" }))

    const response = await app.fetch(request("/r2/object?key=notes/a.txt"))

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe("hello world")
  })

  it("returns 404 for a missing object", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/r2/object?key=notes/missing.txt"))

    expect(response.status).toBe(404)
  })

  it("deletes an object", async () => {
    const app = await loadApp()
    await app.fetch(datastarPost("/r2/put", { key: "notes/a.txt", content: "hello" }))

    const response = await app.fetch(datastarPost("/r2/delete", { key: "notes/a.txt" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain("The bucket is empty. Save an object above.")
  })

  it("rejects an unsafe key without writing to the bucket", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/r2/put", { key: "../escape", content: "nope" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Use a key like notes/hello.txt")

    const listed = await env.APP_BUCKET.list()
    expect(listed.objects).toHaveLength(0)
  })
})
