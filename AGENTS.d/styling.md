# Styling guide

## Tailwind and vanilla CSS split

Use Tailwind and CSS as a hybrid system, not as opposing religions.

- Tailwind applies the design system locally: component layout, spacing, responsive behavior,
  typography application, tokenized colors, borders/radii, and normal hover/focus/active/dark states.
- CSS defines the design system and handles cascade-native/global problems: `@theme` tokens,
  `@font-face`, base/reset styles, focus defaults, prose/markdown/CMS content, complex selectors,
  custom utilities, keyframes, third-party overrides, and hard-to-read arbitrary values.
- Prefer components/partials for repeated UI. Do not create CSS classes or `@apply` blocks just to
  hide long Tailwind class strings.
- `@apply` is an escape hatch, not the architecture. Use it mainly for tiny single-element
  primitives, third-party overrides, or non-component templating contexts.
- Arbitrary values are fine for true one-offs (`top-[117px]`, custom grid tracks, CSS variables).
  If repeated, promote the value into a token, utility, or component API.
- If a selector becomes unreadable as Tailwind arbitrary variants, move it to CSS.
- For content-heavy surfaces, docs, markdown, WYSIWYG, or semantic prose, lean more on
  CSS/base/prose rules because the generated HTML cannot reliably carry utility classes.
- For component-heavy product UI, lean Tailwind-first, with CSS kept small and deliberate.
- Do not add Tailwind to a tiny static page only because it is trendy; if Tailwind is already in
  the project, use the existing system.
- Knowing CSS remains required. Tailwind is a productivity layer over CSS, not a replacement for
  understanding layout, cascade, inheritance, specificity, and accessibility.
