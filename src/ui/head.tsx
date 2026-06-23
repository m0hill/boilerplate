import { DATASTAR_RUNTIME } from "../constants.js"

/** Shared `<head>` tags included by full-page responses. */
export const pageHead = () => [
  <link rel="stylesheet" href="/app.css" />,
  <script type="module" src={DATASTAR_RUNTIME} />,
]

/** References a bundled browser island from `src/client/<name>.ts`. */
export const clientScript = (name: string) => <script type="module" src={`/js/${name}.js`} />
