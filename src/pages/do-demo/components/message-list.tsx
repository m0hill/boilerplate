import { DateTime, Option } from "effect"
import type { Message } from "@/resources/chat-room/room"
import type { RoomName } from "@/resources/chat-room/rooms"

const formatUtcTime = DateTime.formatUtc({
  hour: "2-digit",
  locale: "en-US",
  minute: "2-digit",
})

const formatTime = (ms: number): string =>
  DateTime.make(ms).pipe(
    Option.match({
      onNone: () => "",
      onSome: formatUtcTime,
    }),
  )

export const MessageList = ({
  room,
  messages,
}: {
  readonly room: RoomName
  readonly messages: readonly Message[]
}) => (
  <section
    id="do-messages"
    aria-label={`Messages in ${room}`}
    class="flex flex-col gap-3 rounded-lg border border-border p-4"
  >
    <h2 class="font-mono text-sm text-muted">#{room}</h2>
    {messages.length === 0 ? (
      <p class="text-muted">No messages in this room yet. Say hello.</p>
    ) : (
      <ul class="flex flex-col gap-2">
        {messages.map((message) => (
          <li class="flex flex-col">
            <div class="flex items-baseline gap-2">
              <span class="font-medium">{message.author}</span>
              <span class="text-xs text-muted tabular-nums">{formatTime(message.createdAt)}</span>
            </div>
            <p class="text-sm">{message.body}</p>
          </li>
        ))}
      </ul>
    )}
  </section>
)
