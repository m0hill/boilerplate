import { DATASTAR_RUNTIME } from "../lib/constants.js"

export const pageHead = () => [
  <link rel="stylesheet" href="/app.css" />,
  <script type="module" src={DATASTAR_RUNTIME} />,
]
