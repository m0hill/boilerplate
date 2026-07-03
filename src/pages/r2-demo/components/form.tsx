import { local, mod, post } from "datastar-kit"
import type { R2FormState } from "@/pages/r2-demo/state"
import { Button } from "@/ui/button"
import { Field, FieldError } from "@/ui/field"
import { Input, Textarea } from "@/ui/input"

const saveBusy = local<boolean>("saveBusy")

export const ObjectForm = ({ form }: { readonly form: R2FormState }) => (
  <form
    id="r2-form"
    data-signals={mod(form.defaults, { ifMissing: true })}
    data-indicator={saveBusy}
    data-on:submit={mod(post("/r2/put"), { prevent: true })}
    class="flex flex-col gap-3"
  >
    <Field label="Key">
      <Input
        name="key"
        autocomplete="off"
        placeholder="notes/hello.txt"
        data-bind={form.refs.key}
        class="font-mono"
      />
    </Field>
    <Field label="Content">
      <Textarea
        name="content"
        rows="3"
        data-bind={form.refs.content}
      ></Textarea>
    </Field>
    <div class="flex items-center gap-3">
      <Button
        type="submit"
        busy={saveBusy}
      >
        Save object
      </Button>
      <FieldError
        id="r2-error"
        signal={form.refs.errors.form}
      />
    </div>
  </form>
)
