import { event } from "datastar-kit"
import { Effect, Layer, Match, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarSignals, decodeSignals } from "@/lib/datastar"
import { annotate } from "@/lib/observability/request-log"
import { liveView } from "@/lib/realtime/live-view"
import { ChatRooms, type ChatRoomsError } from "@/resources/chat-room/chat-rooms"
import { type InvalidMessageError, maxBodyLength } from "@/resources/chat-room/rooms"
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
  datastarSignals(chatForm.patch({ errors: { form: message } }))

const logRoomUnavailable = (action: string, error: ChatRoomsError) =>
  annotate({ do: { ok: false, action, reason: error.reason, cause: error.cause } })

const roomSearchParam = HttpRouter.schemaParams(RoomSearchParams).pipe(
  Effect.map(({ room }) => room),
  Effect.catchTag("SchemaError", () => Effect.succeed(Option.none<string>())),
)

const doDemoPage = Effect.fn("doDemo.page")(
  function* () {
    const chatRooms = yield* ChatRooms
    const rawRoom = yield* roomSearchParam
    const room = yield* chatRooms.selectRoom(rawRoom)
    const messages = yield* chatRooms.list(room)
    yield* annotate({
      do: { ok: true, action: "list", room, count: messages.length },
    })

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
  Effect.catchTag("ChatRoomsError", (error) =>
    logRoomUnavailable("list", error).pipe(
      Effect.as(HttpServerResponse.text("Durable Object demo unavailable", { status: 503 })),
    ),
  ),
)

const liveMessages = Effect.fn("doDemo.live")(
  function* () {
    const chatRooms = yield* ChatRooms
    const rawRoom = yield* roomSearchParam
    const room = yield* chatRooms.selectRoom(rawRoom)

    return yield* liveView({
      subscribe: chatRooms
        .subscribe(room)
        .pipe(Effect.tap(() => annotate({ do: { ok: true, action: "subscribe", room } }))),
      render: chatRooms.list(room).pipe(
        Effect.map((messages) =>
          event.patch(
            <MessageList
              room={room}
              messages={messages}
            />,
          ),
        ),
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
    const signals = yield* decodeSignals(request, PostMessageSignals)
    const chatRooms = yield* ChatRooms
    const room = yield* chatRooms.post(signals)
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
