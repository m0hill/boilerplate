import { Hono } from "hono"
import { serveStatic } from "@hono/node-server/serve-static"
import { registerLiveReload } from "./dev/live-reload.js"
import home from "./pages/home/home.js"
import { notFound } from "./pages/not-found.js"

const isDev = process.env.NODE_ENV !== "production"

export const app = new Hono()

if (isDev) {
  registerLiveReload(app)
}

app.route("/", home)

app.use("/*", serveStatic({ root: "./public" }))

app.notFound(notFound)
