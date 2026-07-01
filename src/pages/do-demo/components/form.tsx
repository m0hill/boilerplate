import { get, mod, post } from "datastar-kit"
import type { ChatFormState } from "@/pages/do-demo/state"

export const MessageForm = ({
  form,
  room,
}: {
  readonly form: ChatFormState
  readonly room: string
}) => (
  <form
    id="do-form"
    data-signals={mod(form.reset({ room }), { ifMissing: true })}
    data-init={get(`/do/live?room=${room}`)}
    data-on:submit={mod(post("/do/post"), { prevent: true })}
    class="flex flex-col gap-3"
  >
    <div class="flex flex-wrap gap-3">
      <input
        name="author"
        autocomplete="off"
        placeholder="Your name"
        data-bind={form.refs.author}
        class="w-40 rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        name="body"
        autocomplete="off"
        placeholder={`Message #${room}`}
        data-bind={form.refs.body}
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
      data-show={form.refs.errors.form}
      data-text={form.refs.errors.form}
    ></small>
  </form>
)
