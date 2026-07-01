import { presetRooms } from "@/resources/chat-room/rooms"

export const RoomSwitcher = ({ room }: { readonly room: string }) => (
  <nav class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-gray-500">Room:</span>
    {presetRooms.map((name) => (
      <a
        href={`/do?room=${name}`}
        data-nav-prefetch
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
