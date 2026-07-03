import type { HtmlElements } from "datastar-kit"
import { cx } from "@/ui/cx"

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border border-input hover:bg-surface",
  ghost: "hover:bg-surface",
} as const

const sizes = {
  sm: "px-2 py-1 text-sm",
  md: "px-4 py-2 text-sm",
} as const

export type ButtonProps = HtmlElements["button"] & {
  readonly variant?: keyof typeof variants
  readonly size?: keyof typeof sizes
}

export const Button = ({
  variant = "primary",
  size = "md",
  class: className,
  children,
  ...rest
}: ButtonProps) => (
  <button
    {...rest}
    class={cx(base, variants[variant], sizes[size], className)}
  >
    {children}
  </button>
)
