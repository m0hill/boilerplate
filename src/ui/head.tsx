import { DATASTAR_RUNTIME } from "../constants.js"
import { LIVE_RELOAD_SCRIPT_PATH } from "../dev/live-reload.js"
import { isDev } from "../constants.js"

export const pageHead = () => [
  <link rel="stylesheet" href="/app.css" />,
  <script type="module" src={DATASTAR_RUNTIME} />,
  ...(isDev ? [<script src={LIVE_RELOAD_SCRIPT_PATH} />] : []),
]

export const clientScript = (name: string) => <script type="module" src={`/js/${name}.js`} />
