import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  InvalidMessageError,
  InvalidRoomError,
  maxBodyLength,
  parseMessage,
  parseRoom,
} from "./rooms.js"

const runError = <E>(effect: Effect.Effect<unknown, E>) =>
  Effect.runPromise(effect.pipe(Effect.flip))

describe("parseRoom", () => {
  it("normalizes a room slug", async () => {
    await expect(Effect.runPromise(parseRoom("  Lobby  "))).resolves.toBe("lobby")
  })

  it("rejects an unsafe room name", async () => {
    const error = await runError(parseRoom("../etc"))
    expect(error).toBeInstanceOf(InvalidRoomError)
  })
})

describe("parseMessage", () => {
  it("trims author and body", async () => {
    const message = await Effect.runPromise(parseMessage("  alice ", " hello "))
    expect(message).toEqual({ author: "alice", body: "hello" })
  })

  it("rejects an empty author", async () => {
    const error = await runError(parseMessage("  ", "hi"))
    expect(error).toBeInstanceOf(InvalidMessageError)
    expect(error.reason).toBe("empty_author")
  })

  it("rejects an overlong message", async () => {
    const error = await runError(parseMessage("alice", "x".repeat(maxBodyLength + 1)))
    expect(error.reason).toBe("too_long")
  })
})
