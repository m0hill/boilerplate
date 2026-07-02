import { env } from "cloudflare:workers"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { makeChatRooms } from "@/resources/chat-room/chat-rooms"
import { defaultRoom, InvalidMessageError } from "@/resources/chat-room/rooms"

const chatRooms = () => makeChatRooms(env.CHAT_ROOM)

const runChatRooms = <A, E>(effect: Effect.Effect<A, E>): Promise<A> => Effect.runPromise(effect)

describe("ChatRooms", () => {
  it("selects the default room for missing or invalid query input", async () => {
    const rooms = chatRooms()

    await expect(runChatRooms(rooms.selectRoom(Option.none()))).resolves.toBe(defaultRoom)
    await expect(runChatRooms(rooms.selectRoom(Option.some("../etc")))).resolves.toBe(defaultRoom)
  })

  it("posts raw form input to the selected room", async () => {
    const rooms = chatRooms()
    const room = await runChatRooms(
      rooms.post({
        room: "  Service-Room  ",
        author: "  alice  ",
        body: "  hello service  ",
      }),
    )

    expect(room).toBe("service-room")

    const messages = await runChatRooms(rooms.list(room))
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          author: "alice",
          body: "hello service",
        }),
      ]),
    )
  })

  it("rejects invalid message input before writing", async () => {
    const rooms = chatRooms()
    const error = await Effect.runPromise(
      rooms
        .post({
          room: "service-invalid",
          author: "alice",
          body: "",
        })
        .pipe(Effect.flip),
    )

    expect(error).toBeInstanceOf(InvalidMessageError)
  })
})
