# Styling

- Tokens: `src/styles.css`.
- Primitives: `src/ui/`.
- Showcase: `/design`.
- Call sites use Tailwind v4 utilities.

## Tokens

- Colors use semantic `@theme` tokens.
- Default palette is disabled.
- Use token classes: `text-muted`, `bg-surface`, `border-border`, `bg-primary`.
- Roles: `background`, `surface`, `foreground`, `muted`, `border`, `input`, `primary`, `primary-hover`, `primary-foreground`, `danger`, `ring`.
- Body text needs no color class.
- `muted` is secondary text.
- `surface` is neutral filled UI.
- `border` is containers and dividers.
- `input` is form control borders.
- Add tokens only for repeated roles.
- Name roles, not hues.
- Raw colors stay in `src/styles.css` or browser drawing code.
- Do not use arbitrary color utilities in TSX.

## Utilities

- Use utilities for layout, spacing, type, radius, borders, and states.
- Use token color utilities only.
- Prefer parent `gap-*` over sibling margins.
- Radius: controls `rounded-md`, containers `rounded-lg`, pills `rounded-full`.
- Type: pages `text-2xl font-bold`, sections `text-lg font-semibold`.
- Secondary text: `text-sm text-muted`.
- Fine print: `text-xs`.
- Focus is global.
- Do not add per-element rings.
- Long repeated class strings become primitives or page components.

## Primitives

- Shared primitives: `Button`, `Input`, `Textarea`, `Field`, `FieldError`, `Badge`, `Layout`, `pageHead`.
- Wrap native elements.
- Pass native and Datastar `data-*` attributes through.
- Variants are typed object maps.
- No `cva`, `clsx`, `tailwind-merge`, or runtime styling libraries.
- Primitives own internal classes.
- Call-site `class` is for layout or one-off formatting only.
- Restyle primitives with a variant or a primitive fix.
- Join classes with `src/ui/cx.ts`.
- Extract after repeated real use.
- Prefer native elements.
- Keep one primitive family per `src/ui/` file.
- Native wrappers use `HtmlElements["tag"] & { ... }` props.
- Start with minimal variants.
- Add new primitives to `/design`.

## Pending state

- Commands show in-flight state, not optimistic success.
- Use a local signal: `const busy = local<boolean>("saveBusy")`.
- Put `data-indicator={busy}` on the fetch trigger.
- Pass the same signal to `Button` `busy`.
- Busy button CSS lives in `src/styles.css`.
- Do not put `data-indicator` on long-lived streams.
- No page overlays.
- Long jobs stream progress as SSE patches.

## CSS

- `src/styles.css` owns `@theme`, base, fonts, globals, keyframes, third-party overrides, prose, and awkward selectors.
- Keep product CSS small.
- Use more CSS for generated or content-heavy markup.
- True one-offs stay inline as utilities.

## Check

- No palette colors in TSX.
- No arbitrary color utilities in TSX.
- No raw colors in component TSX.
- Repeated UI becomes a primitive or page component.
- Interactive elements are native and keyboard-reachable.
- New primitives appear on `/design`.
