import { local, mod, post } from "datastar-kit"
import type { RoomName } from "@/resources/chat-room/rooms"
import type { ChatFormState } from "@/pages/do-demo/state"
import { Button } from "@/ui/button"
import { FieldError } from "@/ui/field"
import { Input } from "@/ui/input"

const postBusy = local<boolean>("postBusy")

export const MessageForm = ({
  form,
  room,
}: {
  readonly form: ChatFormState
  readonly room: RoomName
}) => (
  <form
    id="do-form"
    data-signals={mod(form.reset({ room }), { ifMissing: true })}
    data-indicator={postBusy}
    data-on:submit={mod(post("/do/post"), { prevent: true })}
    class="flex flex-col gap-3"
  >
    <div class="flex flex-wrap gap-3">
      <Input
        name="author"
        autocomplete="off"
        placeholder="Your name"
        data-bind={form.refs.author}
        class="sm:w-40"
      />
      <Input
        name="body"
        autocomplete="off"
        placeholder={`Message #${room}`}
        data-bind={form.refs.body}
        class="min-w-0 flex-1"
      />
      <Button
        type="submit"
        busy={postBusy}
      >
        Post
      </Button>
    </div>
    <FieldError
      id="do-error"
      signal={form.refs.errors.form}
    />
  </form>
)
