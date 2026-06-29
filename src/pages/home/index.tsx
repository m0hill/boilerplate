import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { SITE_TITLE } from "../../lib/constants.js"
import { datastarPage } from "../../lib/datastar.js"
import { annotate } from "../../lib/observability/request-log.js"
import { pageHead } from "../../ui/head.js"
import { HomePage } from "./components/page.js"

const homePage = Effect.gen(function* () {
  yield* annotate({ page: { name: "home" } })

  return datastarPage(<HomePage />, {
    title: SITE_TITLE,
    head: pageHead(),
  })
}).pipe(Effect.withSpan("home.page"))

export const homeRoutes = HttpRouter.add("GET", "/", homePage)
