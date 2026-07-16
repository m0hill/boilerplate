import type { HtmlChild } from "datastar-kit"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Field } from "@/ui/field"
import { Input, Textarea } from "@/ui/input"
import { Layout } from "@/ui/layout"

const sources = [
  { path: "src/styles.css", role: "design tokens (@theme) and base styles" },
  { path: "src/ui/", role: "shared primitives: Button, Input, Textarea, Field, Badge" },
  { path: "docs/styling.md", role: "the rules: tokens, utilities, when to add a primitive" },
] as const

const colorTokens = [
  { name: "background", swatch: "border border-border bg-background" },
  { name: "surface", swatch: "bg-surface" },
  { name: "foreground", swatch: "bg-foreground" },
  { name: "muted", swatch: "bg-muted" },
  { name: "border", swatch: "bg-border" },
  { name: "input", swatch: "bg-input" },
  { name: "primary", swatch: "bg-primary" },
  { name: "primary-hover", swatch: "bg-primary-hover" },
  { name: "danger", swatch: "bg-danger" },
] as const

const Section = ({
  title,
  children,
}: {
  readonly title: string
  readonly children: HtmlChild | readonly HtmlChild[]
}) => (
  <section class="flex flex-col gap-3">
    <h2 class="text-lg font-semibold">{title}</h2>
    {children}
  </section>
)

export const DesignPage = () => (
  <Layout
    title="Design system"
    tagline="Every page is built from these tokens and primitives. Change the look in
      src/styles.css; extend the system in src/ui/. If what you need is not here, compose it from
      tokens first and extract a primitive once it repeats."
    sources={sources}
  >
    <Section title="Color tokens">
      <ul class="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {colorTokens.map((token) => (
          <li class="flex flex-col gap-1">
            <div class={`h-10 rounded-md ${token.swatch}`}></div>
            <code class="text-xs text-muted">{token.name}</code>
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Type">
      <div class="flex flex-col gap-2">
        <p class="text-2xl font-bold">Page title — text-2xl font-bold</p>
        <p class="text-lg font-semibold">Section heading — text-lg font-semibold</p>
        <p>Body text — the default, no classes needed</p>
        <p class="text-sm text-muted">Secondary text — text-sm text-muted</p>
        <p class="text-xs font-semibold uppercase tracking-widest text-muted">
          Eyebrow — text-xs uppercase tracking-widest text-muted
        </p>
        <p class="font-mono text-sm">Code and identifiers — font-mono text-sm</p>
      </div>
    </Section>
    <Section title="Buttons">
      <div class="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button disabled>Disabled</Button>
        <Button size="sm">Small</Button>
        <Button
          variant="outline"
          size="sm"
        >
          Small outline
        </Button>
        <Button aria-busy="true">Pending</Button>
      </div>
      <p class="text-sm text-muted">
        Commands are never optimistic. While a request is in flight, Datastar sets aria-busy from a
        data-indicator signal and the trigger shows this spinner — wire it with the Button busy
        prop.
      </p>
    </Section>
    <Section title="Form controls">
      <div class="flex max-w-md flex-col gap-3">
        <Field label="Text input">
          <Input placeholder="Placeholder" />
        </Field>
        <Field label="Textarea">
          <Textarea rows="3"></Textarea>
        </Field>
        <small class="text-sm text-danger">
          Inline error — rendered live by FieldError bound to an errors signal
        </small>
      </div>
    </Section>
    <Section title="Badges">
      <div class="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge>SQLite · Drizzle</Badge>
      </div>
    </Section>
  </Layout>
)
