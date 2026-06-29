import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { SITE_TITLE } from "@/lib/constants"
import { datastarPage } from "@/lib/datastar"
import { annotate } from "@/lib/observability/request-log"
import { pageHead } from "@/ui/head"
import { HomePage } from "@/pages/home/components/page"

const homePage = Effect.gen(function* () {
  yield* annotate({ page: { name: "home" } })

  return datastarPage(<HomePage />, {
    title: SITE_TITLE,
    head: pageHead(),
  })
}).pipe(Effect.withSpan("home.page"))

export const homeRoutes = HttpRouter.add("GET", "/", homePage)
