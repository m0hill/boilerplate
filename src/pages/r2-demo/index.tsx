import { event, state } from "datastar-kit"
import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarSignals, datastarStream, decodeSignals } from "../../lib/datastar.js"
import { annotate } from "../../lib/observability/request-log.js"
import {
  type InvalidObjectError,
  maxContentBytes,
  parseObject,
  parseObjectKey,
} from "../../services/r2-objects/object.js"
import { R2Objects, type R2ObjectsError } from "../../services/r2-objects/r2-objects.js"
import { pageHead } from "../../ui/head.js"
import { ObjectList } from "./components/object-list.js"
import { R2Page } from "./components/page.js"

const r2Form = state({
  key: "notes/hello.txt",
  content: "Stored as an object in R2.",
  errors: { form: "" },
})

const PutSignals = Schema.Struct({ key: Schema.String, content: Schema.String })
const KeySignals = Schema.Struct({ key: Schema.String })

const invalidObjectMessage = (error: InvalidObjectError): string => {
  switch (error.reason) {
    case "invalid_key":
      return "Use a key like notes/hello.txt (letters, numbers, . _ - /)."
    case "empty_content":
      return "Add some content to store."
    case "content_too_large":
      return `Keep content under ${maxContentBytes / 1024} KB for this demo.`
  }
}

const formError = (message: string) => datastarSignals(r2Form.patch({ errors: { form: message } }))

const logR2Unavailable = (action: string, error: R2ObjectsError) =>
  annotate({ r2: { ok: false, action, reason: error.reason, cause: error.cause } })

const r2DemoPage = Effect.gen(function* () {
  const r2Objects = yield* R2Objects
  const objects = yield* r2Objects.list
  yield* annotate({ r2: { ok: true, action: "list", count: objects.length } })

  return datastarPage(<R2Page form={r2Form} objects={objects} />, {
    title: "R2 object store",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("R2ObjectsError", (error) =>
    logR2Unavailable("list", error).pipe(
      Effect.as(HttpServerResponse.text("R2 demo unavailable", { status: 503 })),
    ),
  ),
  Effect.withSpan("r2Demo.page"),
)

const refreshList = Effect.fn("r2Demo.refreshList")(function* (action: string) {
  const r2Objects = yield* R2Objects
  const objects = yield* r2Objects.list
  yield* annotate({ r2: { ok: true, action, count: objects.length } })

  return datastarStream([
    event.signals(r2Form.patch({ errors: { form: "" } })),
    event.patch(<ObjectList objects={objects} />),
  ])
})

const put = Effect.fn("r2Demo.put")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const signals = yield* decodeSignals(request, PutSignals)
    const object = yield* parseObject(signals.key, signals.content)
    const r2Objects = yield* R2Objects
    yield* r2Objects.put(object.key, object.content)

    return yield* refreshList("put")
  },
  Effect.catchTags({
    InvalidSignalsError: () => Effect.succeed(formError("Could not read the form. Try again.")),
    InvalidObjectError: (error) => Effect.succeed(formError(invalidObjectMessage(error))),
    R2ObjectsError: (error) =>
      logR2Unavailable("put", error).pipe(Effect.as(formError("Could not reach R2. Try again."))),
  }),
)

const remove = Effect.fn("r2Demo.remove")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const signals = yield* decodeSignals(request, KeySignals)
    const key = yield* parseObjectKey(signals.key)
    const r2Objects = yield* R2Objects
    yield* r2Objects.remove(key)

    return yield* refreshList("delete")
  },
  Effect.catchTags({
    InvalidSignalsError: () => Effect.succeed(formError("Could not read the request. Try again.")),
    InvalidObjectError: () => Effect.succeed(formError("That object key is not valid.")),
    R2ObjectsError: (error) =>
      logR2Unavailable("delete", error).pipe(
        Effect.as(formError("Could not reach R2. Try again.")),
      ),
  }),
)

const serveObject = Effect.fn("r2Demo.serveObject")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const rawKey = new URL(request.url, "http://r2.local").searchParams.get("key") ?? ""
    const key = yield* parseObjectKey(rawKey)
    const r2Objects = yield* R2Objects
    const content = yield* r2Objects.read(key)

    if (content === null) {
      return HttpServerResponse.text("Object not found", { status: 404 })
    }
    return HttpServerResponse.text(content)
  },
  Effect.catchTags({
    InvalidObjectError: () =>
      Effect.succeed(HttpServerResponse.text("Invalid key", { status: 400 })),
    R2ObjectsError: (error) =>
      logR2Unavailable("read", error).pipe(
        Effect.as(HttpServerResponse.text("R2 demo unavailable", { status: 503 })),
      ),
  }),
)

export const r2DemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/r2", r2DemoPage),
  HttpRouter.add("POST", "/r2/put", put),
  HttpRouter.add("POST", "/r2/delete", remove),
  HttpRouter.add("GET", "/r2/object", serveObject),
)
