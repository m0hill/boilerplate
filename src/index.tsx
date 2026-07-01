import { handleWithEnv } from "@/app"

export { ChatRoom } from "@/resources/chat-room/chat-room"
export { LiveRoom } from "@/resources/live-rooms/live-room"

export default {
  fetch: handleWithEnv,
}
