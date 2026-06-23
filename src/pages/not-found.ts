import { HttpRouter, HttpServerResponse } from "effect/unstable/http"

/** Catch-all route returning a plain `404` for unmatched paths. */
export const notFoundRoute = HttpRouter.add(
  "*",
  "/*",
  HttpServerResponse.text("Not Found", { status: 404 }),
)
