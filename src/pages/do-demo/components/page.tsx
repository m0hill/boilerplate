import { get } from "datastar-kit"
import type { Message } from "@/resources/chat-room/room"
import type { RoomName } from "@/resources/chat-room/rooms"
import { Layout } from "@/ui/layout"
import { MessageForm } from "@/pages/do-demo/components/form"
import { MessageList } from "@/pages/do-demo/components/message-list"
import { RoomSwitcher } from "@/pages/do-demo/components/room-switcher"
import type { ChatFormState } from "@/pages/do-demo/state"

const sources = [
  {
    path: "src/resources/chat-room/chat-room.ts",
    role: "the Durable Object: owns per-room SQLite and its subscribers; post inserts + pulses atomically",
  },
  {
    path: "src/resources/chat-room/room.ts",
    role: "room logic as Effect programs over the DO database",
  },
  {
    path: "src/resources/chat-room/chat-rooms.ts",
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
  readonly room: RoomName
  readonly messages: readonly Message[]
}) => (
  <Layout
    title="Durable Object"
    tagline="Each room is a Durable Object with its own SQLite log and pulse hub. Posting inserts the
      row and wakes subscribers in one object method; every open tab re-reads current messages and
      re-renders, so reconnects and concurrent posts converge on the durable state."
    sources={sources}
  >
    <RoomSwitcher room={room} />
    <div
      data-init={get(`/do/live?room=${room}`)}
      class="flex flex-col gap-6"
    >
      <MessageList
        room={room}
        messages={messages}
      />
      <MessageForm
        form={form}
        room={room}
      />
    </div>
  </Layout>
)
