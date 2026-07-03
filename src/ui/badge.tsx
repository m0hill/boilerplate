import type { HtmlElements } from "datastar-kit"
import { cx } from "@/ui/cx"

export const Badge = ({ class: className, children, ...rest }: HtmlElements["span"]) => (
  <span
    {...rest}
    class={cx(
      "inline-flex w-fit items-center rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted",
      className,
    )}
  >
    {children}
  </span>
)
