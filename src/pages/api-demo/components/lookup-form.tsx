import { local, mod, post } from "datastar-kit"
import type { LookupFormState } from "@/pages/api-demo/state"
import { Button } from "@/ui/button"
import { Field, FieldError } from "@/ui/field"
import { Input } from "@/ui/input"

const lookupBusy = local<boolean>("lookupBusy")

export const LookupForm = ({ form }: { readonly form: LookupFormState }) => (
  <form
    id="lookup-form"
    data-signals={mod(form.defaults, { ifMissing: true })}
    data-indicator={lookupBusy}
    data-on:submit={mod(post("/api/lookup"), { prevent: true })}
    class="flex flex-wrap items-end gap-3"
  >
    <Field
      label="Repository"
      class="w-full sm:w-auto"
    >
      <Input
        name="repo"
        autocomplete="off"
        placeholder="owner/repo"
        data-bind={form.refs.repo}
        class="sm:w-64"
      />
    </Field>
    <Button
      type="submit"
      busy={lookupBusy}
    >
      Look up
    </Button>
    <FieldError
      id="repo-error"
      signal={form.refs.errors.repo}
      class="w-full"
    />
  </form>
)
