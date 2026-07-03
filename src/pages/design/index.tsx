import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { datastarPage } from "@/lib/datastar"
import { annotate } from "@/lib/observability/request-log"
import { pageHead } from "@/ui/head"
import { DesignPage } from "@/pages/design/components/page"

const designPage = Effect.gen(function* () {
  yield* annotate({ page: { name: "design" } })

  return datastarPage(<DesignPage />, {
    title: "Design system",
    head: pageHead(),
  })
}).pipe(Effect.withSpan("design.page"))

export const designRoutes = HttpRouter.add("GET", "/design", designPage)
