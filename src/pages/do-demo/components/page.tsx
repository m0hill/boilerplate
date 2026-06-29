import type { Message } from "../../../services/chat-room/room.js"
import { DemoLayout } from "../../../ui/demo.js"
import { MessageForm, type ChatFormState } from "./form.js"
import { MessageList } from "./message-list.js"
import { RoomSwitcher } from "./room-switcher.js"

const sources = [
  {
    path: "src/services/chat-room/chat-room.ts",
    role: "the Durable Object: owns per-room SQLite and its subscribers; post inserts + pulses atomically",
  },
  {
    path: "src/services/chat-room/room.ts",
    role: "room logic as Effect programs over the DO database",
  },
  {
    path: "src/services/chat-room/chat-rooms.ts",
    role: "worker-side ChatRooms: resolves a room to one DO via RPC (list / post / subscribe)",
  },
  {
    path: "src/lib/realtime/live-view.ts",
    role: "shared: each pulse re-reads the DO log and re-renders — no payload on the wire",
  },
] as const

export const DoPage = ({
  form,
  room,
  messages,
}: {
  readonly form: ChatFormState
  readonly room: string
  readonly messages: readonly Message[]
}) => (
  <DemoLayout
    title="Durable Object"
    tagline="Each room is a Durable Object with its own SQLite log and pulse hub. Posting inserts the
      row and wakes subscribers in one object method; every open tab re-reads current messages and
      re-renders, so reconnects and concurrent posts converge on the durable state."
    sources={sources}
  >
    <RoomSwitcher room={room} />
    <MessageList room={room} messages={messages} />
    <MessageForm form={form} room={room} />
  </DemoLayout>
)
