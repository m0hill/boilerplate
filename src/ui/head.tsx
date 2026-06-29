import { DATASTAR_RUNTIME } from "@/lib/constants"

export const pageHead = () => [
  <link
    rel="stylesheet"
    href="/app.css"
  />,
  <script
    type="module"
    src={DATASTAR_RUNTIME}
  />,
]
