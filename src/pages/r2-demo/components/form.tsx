import { mod, post, type State } from "datastar-kit"

export type R2FormState = State<{
  readonly key: string
  readonly content: string
  readonly errors: { readonly form: string }
}>

export const ObjectForm = ({ form }: { readonly form: R2FormState }) => (
  <form
    id="r2-form"
    data-signals={mod(form.defaults, { ifMissing: true })}
    data-on:submit={mod(post("/r2/put"), { prevent: true })}
    class="flex flex-col gap-3"
  >
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Key</span>
      <input
        name="key"
        autocomplete="off"
        placeholder="notes/hello.txt"
        data-bind={form.refs.key}
        class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Content</span>
      <textarea
        name="content"
        rows="3"
        data-bind={form.refs.content}
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      ></textarea>
    </label>
    <div class="flex items-center gap-3">
      <button
        type="submit"
        class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
      >
        Save object
      </button>
      <small
        id="r2-error"
        style="display: none"
        class="text-red-600"
        data-show={form.refs.errors.form}
        data-text={form.refs.errors.form}
      ></small>
    </div>
  </form>
)
