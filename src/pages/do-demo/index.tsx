import { Effect, Layer, Match, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarSignals, datastarSignalsEffect, decodeSignals } from "@/lib/datastar"
import { annotateAction } from "@/lib/observability/request-log"
import { liveRegion } from "@/lib/realtime/live-view"
import { ChatRooms, type ChatRoomsError } from "@/resources/chat-room/chat-rooms"
import {
  type InvalidMessageError,
  type InvalidRoomError,
  maxBodyLength,
} from "@/resources/chat-room/rooms"
import { pageHead } from "@/ui/head"
import { MessageList } from "@/pages/do-demo/components/message-list"
import { DoPage } from "@/pages/do-demo/components/page"
import { PostMessageSignals, RoomSearchParams, chatForm } from "@/pages/do-demo/state"

const messageError = (error: InvalidMessageError): string =>
  Match.value(error.reason).pipe(
    Match.when("empty_author", () => "Add a name before posting."),
    Match.when("empty_body", () => "Write a message before posting."),
    Match.when("too_long", () => `Keep messages under ${maxBodyLength} characters.`),
    Match.exhaustive,
  )

const formError = (message: string) =>
  datastarSignalsEffect(chatForm.patch({ errors: { form: message } }))

const postFailureFields = (error: InvalidRoomError | InvalidMessageError | ChatRoomsError) =>
  error._tag === "ChatRoomsError" ? { reason: error.reason, cause: error.cause } : undefined

const roomSearchParam = HttpRouter.schemaParams(RoomSearchParams).pipe(
  Effect.map(({ room }) => room),
  Effect.catchTag("SchemaError", () => Effect.succeed(Option.none<string>())),
)

const doDemoPage = Effect.fn("doDemo.page")(
  function* () {
    const chatRooms = yield* ChatRooms
    const rawRoom = yield* roomSearchParam
    const room = yield* chatRooms.selectRoom(rawRoom)
    const messages = yield* annotateAction("do", "list")(chatRooms.list(room), (messages) => ({
      room,
      count: messages.length,
    }))

    return datastarPage(
      <DoPage
        form={chatForm}
        room={room}
        messages={messages}
      />,
      {
        title: `#${room} — Durable Object`,
        head: pageHead(),
      },
    )
  },
  Effect.catchTag("ChatRoomsError", () =>
    Effect.succeed(HttpServerResponse.text("Durable Object demo unavailable", { status: 503 })),
  ),
)

const liveMessages = Effect.fn("doDemo.live")(
  function* () {
    const chatRooms = yield* ChatRooms
    const rawRoom = yield* roomSearchParam
    const room = yield* chatRooms.selectRoom(rawRoom)

    return yield* liveRegion({
      subscribe: annotateAction("do", "subscribe")(chatRooms.subscribe(room), () => ({ room })),
      read: chatRooms.list(room),
      render: (messages) => (
        <MessageList
          room={room}
          messages={messages}
        />
      ),
      log: { feature: "do", room },
    })
  },
  Effect.catchTag("ChatRoomsError", () =>
    Effect.succeed(HttpServerResponse.text("Durable Object demo unavailable", { status: 503 })),
  ),
)

const postMessage = Effect.fn("doDemo.post")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const signals = yield* decodeSignals(request, PostMessageSignals)
    const chatRooms = yield* ChatRooms
    yield* annotateAction("do", "post")(chatRooms.post(signals), {
      success: (room) => ({ room }),
      failure: postFailureFields,
    })

    return datastarSignals(chatForm.patch({ body: "", errors: { form: "" } }))
  },
  Effect.catchTags({
    InvalidSignalsError: () => formError("Could not read the form. Try again."),
    InvalidRoomError: () => formError("Pick a valid room."),
    InvalidMessageError: (error) => formError(messageError(error)),
    ChatRoomsError: () => formError("Could not reach the room. Try again."),
  }),
)

export const doDemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/do", doDemoPage),
  HttpRouter.add("GET", "/do/live", liveMessages),
  HttpRouter.add("POST", "/do/post", postMessage),
)
