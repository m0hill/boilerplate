import { Hono } from "hono"
import home from "./pages/home/home.js"
import { notFound } from "./pages/not-found.js"

const app = new Hono()

app.route("/", home)

app.notFound(notFound)

export default app
