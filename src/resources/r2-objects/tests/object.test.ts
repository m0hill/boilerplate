import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { InvalidObjectError, maxContentBytes, parseObject, parseObjectKey } from "../object.js"

const runError = (effect: Effect.Effect<unknown, InvalidObjectError>) =>
  Effect.runPromise(effect.pipe(Effect.flip))

describe("parseObject", () => {
  it("trims the key and keeps the content", async () => {
    const object = await Effect.runPromise(parseObject("  notes/hello.txt  ", "hi there"))
    expect(object).toEqual({ key: "notes/hello.txt", content: "hi there" })
  })

  it("rejects an unsafe key", async () => {
    const error = await runError(parseObject("../escape", "x"))
    expect(error).toBeInstanceOf(InvalidObjectError)
    expect(error.reason).toBe("invalid_key")
  })

  it("rejects empty content", async () => {
    const error = await runError(parseObject("ok.txt", ""))
    expect(error.reason).toBe("empty_content")
  })

  it("rejects content over the byte budget", async () => {
    const error = await runError(parseObject("ok.txt", "a".repeat(maxContentBytes + 1)))
    expect(error.reason).toBe("content_too_large")
  })
})

describe("parseObjectKey", () => {
  it("accepts a valid key", async () => {
    await expect(Effect.runPromise(parseObjectKey("notes/hello.txt"))).resolves.toBe(
      "notes/hello.txt",
    )
  })

  it("rejects an empty key", async () => {
    const error = await runError(parseObjectKey("   "))
    expect(error.reason).toBe("invalid_key")
  })
})
