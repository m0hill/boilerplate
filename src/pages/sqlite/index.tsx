import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "@/lib/datastar"
import { annotateAction } from "@/lib/observability/request-log"
import { SqliteCount } from "@/pages/sqlite/components/count"
import { SqlitePage } from "@/pages/sqlite/components/page"
import { SqliteCounter, sqliteCounterNames } from "@/services/sqlite/counter"
import { pageHead } from "@/ui/head"

const sqliteUnavailable = () =>
  Effect.succeed(HttpServerResponse.text("SQLite counter unavailable", { status: 503 }))

const sqlitePage = Effect.gen(function* () {
  const counter = yield* SqliteCounter
  const count = yield* annotateAction(
    "sqliteCounter",
    "view",
  )(counter.current(sqliteCounterNames.sqlite))

  return datastarPage(<SqlitePage count={count} />, {
    title: "SQLite + Drizzle counter",
    head: pageHead(),
  })
}).pipe(Effect.catchTag("SqliteCounterError", sqliteUnavailable), Effect.withSpan("sqlite.page"))

const increment = Effect.gen(function* () {
  const counter = yield* SqliteCounter
  const count = yield* annotateAction(
    "sqliteCounter",
    "increment",
  )(counter.increment(sqliteCounterNames.sqlite))

  return datastarPatch(<SqliteCount count={count} />)
}).pipe(
  Effect.catchTag("SqliteCounterError", sqliteUnavailable),
  Effect.withSpan("sqlite.increment"),
)

export const sqliteRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/sqlite", sqlitePage),
  HttpRouter.add("POST", "/sqlite/increment", increment),
)
