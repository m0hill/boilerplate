import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { datastarPage } from "../../datastar.js"
import { annotate } from "../../observability/request-log.js"
import { clientScript, pageHead } from "../../ui/head.js"
import { WebComponentDemoMain } from "./views.js"

const webComponentDemoPage = Effect.gen(function* () {
  yield* annotate({ page: { name: "web-component" } })

  return datastarPage(<WebComponentDemoMain />, {
    title: "Web component",
    head: [...pageHead(), clientScript("qr")],
  })
}).pipe(Effect.withSpan("webComponentDemo.page"))

export const webComponentDemoRoutes = HttpRouter.add("GET", "/web-component", webComponentDemoPage)
