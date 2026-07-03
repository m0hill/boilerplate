import type { HtmlElements } from "datastar-kit"
import { cx } from "@/ui/cx"

const control = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

export const Input = ({ class: className, ...rest }: HtmlElements["input"]) => (
  <input
    {...rest}
    class={cx(control, className)}
  />
)

export const Textarea = ({ class: className, children, ...rest }: HtmlElements["textarea"]) => (
  <textarea
    {...rest}
    class={cx(control, className)}
  >
    {children}
  </textarea>
)
