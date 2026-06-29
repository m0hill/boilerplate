import type { Message } from "@/resources/chat-room/room"

const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

export const MessageList = ({
  room,
  messages,
}: {
  readonly room: string
  readonly messages: readonly Message[]
}) => (
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
