import { get, mod, post, state } from "datastar-kit"
import { DemoLayout } from "../../ui/demo.js"
import type { Message } from "./room.js"
import { presetRooms } from "./rooms.js"

const sources = [
  {
    path: "src/pages/do-demo/chat-room.ts",
    role: "the Durable Object: per-room SQLite + Drizzle migrate",
  },
  { path: "src/pages/do-demo/room.ts", role: "room logic as Effect programs over the DO database" },
  {
    path: "src/pages/do-demo/store.ts",
    role: "worker-side RoomClient: resolves a room to one DO via RPC, opens/publishes live streams",
  },
  { path: "drizzle-do/", role: "Drizzle migrations generated for the durable-sqlite driver" },
] as const

export const chatForm = state({ room: "", author: "", body: "", errors: { form: "" } })

const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

const RoomSwitcher = ({ room }: { room: string }) => (
  <nav class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-gray-500">Room:</span>
    {presetRooms.map((name) => (
      <a
        href={`/do?room=${name}`}
        class={
          name === room
            ? "rounded bg-black px-2 py-1 font-medium text-white"
            : "rounded border border-gray-300 px-2 py-1 hover:bg-gray-100"
        }
      >
        #{name}
      </a>
    ))}
  </nav>
)

export const MessageList = ({ room, messages }: { room: string; messages: readonly Message[] }) => (
  <section
    id="do-messages"
    aria-label={`Messages in ${room}`}
    class="flex flex-col gap-3 rounded border border-gray-200 p-4"
  >
    <h2 class="font-mono text-sm text-gray-500">#{room}</h2>
    {messages.length === 0 ? (
      <p class="text-gray-500">No messages in this room yet. Say hello.</p>
    ) : (
      <ul class="flex flex-col gap-2">
        {messages.map((message) => (
          <li class="flex flex-col">
            <div class="flex items-baseline gap-2">
              <span class="font-medium">{message.author}</span>
              <span class="text-xs text-gray-400 tabular-nums">
                {formatTime(message.createdAt)}
              </span>
            </div>
            <p class="text-sm text-gray-800">{message.body}</p>
          </li>
        ))}
      </ul>
    )}
  </section>
)

export const DoDemoMain = ({ room, messages }: { room: string; messages: readonly Message[] }) => (
  <DemoLayout
    title="Durable Object"
    tagline="Each room is a single Durable Object instance with its own embedded SQLite database
      (migrated by Drizzle). Because one object handles a room's writes single-threaded, the log is
      strongly consistent — no read-modify-write races like an eventually-consistent store. The same
      object fans every new message out over a Datastar SSE stream, so all open tabs sync live."
    sources={sources}
  >
    <RoomSwitcher room={room} />
    <MessageList room={room} messages={messages} />
    <form
      id="do-form"
      data-signals={mod(chatForm.reset({ room }), { ifMissing: true })}
      data-init={get(`/do/live?room=${room}`)}
      data-on:submit={mod(post("/do/post"), { prevent: true })}
      class="flex flex-col gap-3"
    >
      <div class="flex flex-wrap gap-3">
        <input
          name="author"
          autocomplete="off"
          placeholder="Your name"
          data-bind={chatForm.refs.author}
          class="w-40 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="body"
          autocomplete="off"
          placeholder={`Message #${room}`}
          data-bind={chatForm.refs.body}
          class="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          class="rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
        >
          Post
        </button>
      </div>
      <small
        id="do-error"
        style="display: none"
        class="text-red-600"
        data-show={chatForm.refs.errors.form}
        data-text={chatForm.refs.errors.form}
      ></small>
    </form>
  </DemoLayout>
)
