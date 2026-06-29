import { event, state } from "datastar-kit"
import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarSignals, decodeSignals } from "../../lib/datastar.js"
import { annotate } from "../../lib/observability/request-log.js"
import { liveView } from "../../lib/realtime/live-view.js"
import { ChatRooms, type ChatRoomsError } from "../../resources/chat-room/chat-rooms.js"
import {
  type InvalidMessageError,
  maxBodyLength,
  parseMessage,
  parseRoom,
} from "../../resources/chat-room/rooms.js"
import { pageHead } from "../../ui/head.js"
import { MessageList } from "./components/message-list.js"
import { DoPage } from "./components/page.js"

const chatForm = state({ room: "", author: "", body: "", errors: { form: "" } })

const PostSignals = Schema.Struct({
  room: Schema.String,
  author: Schema.String,
  body: Schema.String,
})

const messageError = (error: InvalidMessageError): string => {
  switch (error.reason) {
    case "empty_author":
      return "Add a name before posting."
    case "empty_body":
      return "Write a message before posting."
    case "too_long":
      return `Keep messages under ${maxBodyLength} characters.`
  }
}

const formError = (message: string) =>
  datastarSignals(chatForm.patch({ errors: { form: message } }))

const logRoomUnavailable = (action: string, error: ChatRoomsError) =>
  annotate({ do: { ok: false, action, reason: error.reason, cause: error.cause } })

const doDemoPage = Effect.fn("doDemo.page")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const rawRoom = new URL(request.url, "http://do.local").searchParams.get("room") ?? "lobby"
    const room = yield* parseRoom(rawRoom).pipe(Effect.orElseSucceed(() => "lobby"))
    const chatRooms = yield* ChatRooms
    const messages = yield* chatRooms.list(room)
    yield* annotate({
      do: { ok: true, action: "list", room, count: messages.length },
    })

    return datastarPage(<DoPage form={chatForm} room={room} messages={messages} />, {
      title: `#${room} — Durable Object`,
      head: pageHead(),
    })
  },
  Effect.catchTag("ChatRoomsError", (error) =>
    logRoomUnavailable("list", error).pipe(
      Effect.as(HttpServerResponse.text("Durable Object demo unavailable", { status: 503 })),
    ),
  ),
)

const liveMessages = Effect.fn("doDemo.live")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const rawRoom = new URL(request.url, "http://do.local").searchParams.get("room") ?? "lobby"
    const room = yield* parseRoom(rawRoom).pipe(Effect.orElseSucceed(() => "lobby"))
    const chatRooms = yield* ChatRooms

    const pulses = yield* chatRooms.subscribe(room)
    yield* annotate({ do: { ok: true, action: "subscribe", room } })

    return yield* liveView({
      pulses,
      render: chatRooms
        .list(room)
        .pipe(
          Effect.map((messages) => event.patch(<MessageList room={room} messages={messages} />)),
        ),
      log: { feature: "do", room },
    })
  },
  Effect.catchTag("ChatRoomsError", (error) =>
    logRoomUnavailable("subscribe", error).pipe(
      Effect.as(HttpServerResponse.text("Durable Object demo unavailable", { status: 503 })),
    ),
  ),
)

const postMessage = Effect.fn("doDemo.post")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const signals = yield* decodeSignals(request, PostSignals)
    const room = yield* parseRoom(signals.room)
    const message = yield* parseMessage(signals.author, signals.body)
    const chatRooms = yield* ChatRooms
    yield* chatRooms.post(room, message.author, message.body)
    yield* annotate({ do: { ok: true, action: "post", room } })

    return datastarSignals(chatForm.patch({ body: "", errors: { form: "" } }))
  },
  Effect.catchTags({
    InvalidSignalsError: () => Effect.succeed(formError("Could not read the form. Try again.")),
    InvalidRoomError: () => Effect.succeed(formError("Pick a valid room.")),
    InvalidMessageError: (error) => Effect.succeed(formError(messageError(error))),
    ChatRoomsError: (error) =>
      logRoomUnavailable("post", error).pipe(
        Effect.as(formError("Could not reach the room. Try again.")),
      ),
  }),
)

export const doDemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/do", doDemoPage),
  HttpRouter.add("GET", "/do/live", liveMessages),
  HttpRouter.add("POST", "/do/post", postMessage),
)
