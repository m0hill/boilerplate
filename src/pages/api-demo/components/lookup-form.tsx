import { mod, post } from "datastar-kit"
import type { LookupFormState } from "@/pages/api-demo/state"

export const LookupForm = ({ form }: { readonly form: LookupFormState }) => (
  <form
    id="lookup-form"
    data-signals={mod(form.defaults, { ifMissing: true })}
    data-on:submit={mod(post("/api/lookup"), { prevent: true })}
    class="flex flex-wrap items-end gap-3"
  >
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Repository</span>
      <input
        name="repo"
        autocomplete="off"
        placeholder="owner/repo"
        data-bind={form.refs.repo}
        class="w-64 rounded border border-gray-300 px-3 py-2"
      />
    </label>
    <button
      type="submit"
      class="rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
    >
      Look up
    </button>
    <small
      id="repo-error"
      style="display: none"
      class="w-full text-red-600"
      data-show={form.refs.errors.repo}
      data-text={form.refs.errors.repo}
    ></small>
  </form>
)
