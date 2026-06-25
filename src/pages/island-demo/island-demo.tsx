import { Effect } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { datastarPage } from "../../datastar.js"
import { clientScript, pageHead } from "../../ui/head.js"
import { IslandDemoMain } from "./views.js"

const islandDemoPage = Effect.gen(function* () {
  yield* Effect.annotateLogsScoped({ page: { name: "island" } })

  return datastarPage(<IslandDemoMain />, {
    title: "Client island",
    head: [...pageHead(), clientScript("qr")],
  })
}).pipe(Effect.withSpan("islandDemo.page"))

export const islandDemoRoutes = HttpRouter.add("GET", "/island", islandDemoPage)
