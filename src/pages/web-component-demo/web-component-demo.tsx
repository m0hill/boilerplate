import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { datastarPage } from "../../datastar.js"
import { clientScript, pageHead } from "../../ui/head.js"
import { WebComponentDemoMain } from "./views.js"

const webComponentDemoPage = Effect.gen(function* () {
  yield* Effect.annotateLogsScoped({ page: { name: "web-component" } })

  return datastarPage(<WebComponentDemoMain />, {
    title: "Web component",
    head: [...pageHead(), clientScript("qr")],
  })
}).pipe(Effect.withSpan("webComponentDemo.page"))

export const webComponentDemoRoutes = HttpRouter.add("GET", "/web-component", webComponentDemoPage)
