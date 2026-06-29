import { state } from "datastar-kit"
import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { datastarPage } from "@/lib/datastar"
import { annotate } from "@/lib/observability/request-log"
import { pageHead } from "@/ui/head"
import { WebComponentPage } from "@/pages/web-component-demo/components/page"

const qrForm = state({ text: "https://github.com/m0hill/boilerplate" })

const webComponentDemoPage = Effect.gen(function* () {
  yield* annotate({ page: { name: "web-component" } })

  return datastarPage(<WebComponentPage form={qrForm} />, {
    title: "Web component",
    head: [...pageHead(), <script type="module" src="/js/qr.js" />],
  })
}).pipe(Effect.withSpan("webComponentDemo.page"))

export const webComponentDemoRoutes = HttpRouter.add("GET", "/web-component", webComponentDemoPage)
