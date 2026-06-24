import { HttpRouter, HttpServerResponse } from "effect/unstable/http"

export const notFoundRoute = HttpRouter.add(
  "*",
  "/*",
  HttpServerResponse.text("Not Found", { status: 404 }),
)
