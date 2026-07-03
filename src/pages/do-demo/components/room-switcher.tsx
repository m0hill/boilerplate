import { presetRooms, type RoomName } from "@/resources/chat-room/rooms"

export const RoomSwitcher = ({ room }: { readonly room: RoomName }) => (
  <nav class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-muted">Room:</span>
    {presetRooms.map((name) => (
      <a
        href={`/do?room=${name}`}
        data-nav-prefetch
        class={
          name === room
            ? "rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground"
            : "rounded-md border border-input px-2 py-1 hover:bg-surface"
        }
      >
        #{name}
      </a>
    ))}
  </nav>
)
