import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { SITE_TITLE } from "../../constants.js"
import { datastarPage } from "../../datastar.js"
import { annotate } from "../../observability/request-log.js"
import { pageHead } from "../../ui/head.js"
import { HomeMain } from "./views.js"

const homePage = Effect.gen(function* () {
  yield* annotate({ page: { name: "home" } })

  return datastarPage(<HomeMain />, {
    title: SITE_TITLE,
    head: pageHead(),
  })
}).pipe(Effect.withSpan("home.page"))

export const homeRoutes = HttpRouter.add("GET", "/", homePage)
