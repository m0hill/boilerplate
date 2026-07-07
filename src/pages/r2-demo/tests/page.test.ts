import { Context, Effect, Option } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { R2Objects, R2ObjectsError } from "@/resources/r2-objects/r2-objects"
import { clearR2Objects, countR2Objects, datastarPost, loadApp, request } from "@/test/utils"
import { loadAppWithServiceOverrides } from "@/test/utils"

beforeEach(clearR2Objects)

const r2ObjectsService = (overrides: Partial<R2Objects["Service"]> = {}) =>
  R2Objects.of({
    list: Effect.succeed([]),
    put: () => Effect.succeed(undefined),
    read: () => Effect.succeed(Option.none()),
    remove: () => Effect.succeed(undefined),
    ...overrides,
  })

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

    await expect(countR2Objects()).resolves.toBe(0)
  })

  it("renders list service failures as unavailable", async () => {
    const app = await loadAppWithServiceOverrides((context) =>
      context.pipe(
        Context.add(
          R2Objects,
          r2ObjectsService({
            list: Effect.fail(new R2ObjectsError({ reason: "list_failed" })),
          }),
        ),
      ),
    )

    const response = await app.fetch(request("/r2"))
    const body = await response.text()

    expect(response.status).toBe(503)
    expect(body).toBe("R2 demo unavailable")
  })

  it("renders write service failures as form errors", async () => {
    const app = await loadAppWithServiceOverrides((context) =>
      context.pipe(
        Context.add(
          R2Objects,
          r2ObjectsService({
            put: () => Effect.fail(new R2ObjectsError({ reason: "put_failed" })),
          }),
        ),
      ),
    )

    const response = await app.fetch(
      datastarPost("/r2/put", { key: "notes/a.txt", content: "hello" }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Could not reach R2. Try again.")
  })
})
