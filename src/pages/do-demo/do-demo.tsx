import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { event } from "datastar-kit"
import { datastarPage, datastarSignals, datastarStream, decodeSignals } from "../../datastar.js"
import { annotate } from "../../observability/request-log.js"
import { pageHead } from "../../ui/head.js"
import { type InvalidMessageError, maxBodyLength, parseMessage, parseRoom } from "./rooms.js"
import { RoomClient, type DoRoomError } from "./store.js"
import { chatForm, DoDemoMain, MessageList } from "./views.js"

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

const logRoomUnavailable = (action: string, error: DoRoomError) =>
  annotate({ do: { ok: false, action, reason: error.reason, cause: error.cause } })

const doDemoPage = Effect.fn("doDemo.page")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const rawRoom = new URL(request.url, "http://do.local").searchParams.get("room") ?? "lobby"
    const room = yield* parseRoom(rawRoom).pipe(Effect.orElseSucceed(() => "lobby"))
    const client = yield* RoomClient
    const messages = yield* client.list(room)
    yield* annotate({
      do: { ok: true, action: "list", room, count: messages.length },
    })

    return datastarPage(<DoDemoMain room={room} messages={messages} />, {
      title: `#${room} — Durable Object`,
      head: pageHead(),
    })
  },
  Effect.catchTag("DoRoomError", (error) =>
    logRoomUnavailable("list", error).pipe(
      Effect.as(HttpServerResponse.text("Durable Object demo unavailable", { status: 503 })),
    ),
  ),
)

const liveMessages = Effect.fn("doDemo.live")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const rawRoom = new URL(request.url, "http://do.local").searchParams.get("room") ?? "lobby"
    const room = yield* parseRoom(rawRoom).pipe(Effect.orElseSucceed(() => "lobby"))
    const client = yield* RoomClient
    const messages = yield* client.list(room)
    yield* annotate({
      do: { ok: true, action: "subscribe", room, count: messages.length },
    })

    const stream = yield* client.subscribe(
      room,
      event.patch(<MessageList room={room} messages={messages} />),
    )

    return HttpServerResponse.raw(stream)
  },
  Effect.catchTag("DoRoomError", (error) =>
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
    const client = yield* RoomClient
    const messages = yield* client.post(room, message.author, message.body)
    const messageList = event.patch(<MessageList room={room} messages={messages} />)
    yield* client.publish(room, messageList)
    yield* annotate({
      do: { ok: true, action: "post", room, count: messages.length },
    })

    return datastarStream([
      event.signals(chatForm.patch({ body: "", errors: { form: "" } })),
      messageList,
    ])
  },
  Effect.catchTags({
    InvalidSignalsError: () => Effect.succeed(formError("Could not read the form. Try again.")),
    InvalidRoomError: () => Effect.succeed(formError("Pick a valid room.")),
    InvalidMessageError: (error) => Effect.succeed(formError(messageError(error))),
    DoRoomError: (error) =>
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
