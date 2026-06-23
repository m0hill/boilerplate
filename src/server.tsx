import { Hono } from "hono"
import type { AppEnv } from "./app-env.js"
import home from "./pages/home/home.js"
import { initLog, logger } from "./observability/index.js"
import { notFound } from "./pages/not-found.js"

initLog({ service: "boilerplate" })

const app: Hono<AppEnv> = new Hono<AppEnv>()

app.use(logger())

app.route("/", home)

app.notFound(notFound)

export default app
