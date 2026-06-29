import { DATASTAR_RUNTIME } from "../constants.js"

export const pageHead = () => [
  <link rel="stylesheet" href="/app.css" />,
  <script type="module" src={DATASTAR_RUNTIME} />,
]
