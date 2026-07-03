import type { Expr, HtmlChild } from "datastar-kit"
import { cx } from "@/ui/cx"

export const Field = ({
  label,
  class: className,
  children,
}: {
  readonly label: string
  readonly class?: string
  readonly children: HtmlChild | readonly HtmlChild[]
}) => (
  <label class={cx("flex flex-col gap-1", className)}>
    <span class="text-sm font-medium">{label}</span>
    {children}
  </label>
)

export const FieldError = ({
  id,
  signal,
  class: className,
}: {
  readonly id: string
  readonly signal: Expr<string> | string
  readonly class?: string
}) => (
  <small
    id={id}
    style="display: none"
    class={cx("text-sm text-danger", className)}
    data-show={signal}
    data-text={signal}
  ></small>
)
