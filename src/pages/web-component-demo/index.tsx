import { state } from "datastar-kit"
import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { datastarPage } from "../../lib/datastar.js"
import { annotate } from "../../lib/observability/request-log.js"
import { clientScript, pageHead } from "../../ui/head.js"
import { WebComponentPage } from "./components/page.js"

const qrForm = state({ text: "https://github.com/m0hill/boilerplate" })

const webComponentDemoPage = Effect.gen(function* () {
  yield* annotate({ page: { name: "web-component" } })

  return datastarPage(<WebComponentPage form={qrForm} />, {
    title: "Web component",
    head: [...pageHead(), clientScript("qr")],
  })
}).pipe(Effect.withSpan("webComponentDemo.page"))

export const webComponentDemoRoutes = HttpRouter.add("GET", "/web-component", webComponentDemoPage)
