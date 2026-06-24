# Styling guide

- Tailwind v4 is the default for component layout, spacing, typography, colors, borders, radius,
  and normal interaction states.
- `src/styles.css` is for Tailwind `@theme` tokens, base styles, fonts, global selectors, keyframes,
  third-party overrides, prose/markdown content, and selectors that are awkward as utilities.
- Prefer components or partials for repeated UI. Do not create CSS classes or `@apply` blocks only
  to hide long utility strings.
- Repeated arbitrary values should become a token, utility, or component API. True one-offs may stay
  arbitrary values.
- Keep CSS small and deliberate for product UI; lean on CSS more for content-heavy or generated
  markup.
