import { event } from "datastar-kit"
import { Effect, Layer, Match, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarSignalsEffect, datastarStream, decodeSignals } from "@/lib/datastar"
import { annotateAction } from "@/lib/observability/request-log"
import {
  type InvalidObjectError,
  maxContentBytes,
  parseObject,
  parseObjectKey,
} from "@/resources/r2-objects/object"
import { R2Objects, type StoredObject } from "@/resources/r2-objects/r2-objects"
import { pageHead } from "@/ui/head"
import { ObjectList } from "@/pages/r2-demo/components/object-list"
import { R2Page } from "@/pages/r2-demo/components/page"
import {
  DeleteObjectSignals,
  PutObjectSignals,
  ReadObjectParams,
  r2Form,
} from "@/pages/r2-demo/state"

const invalidObjectMessage = (error: InvalidObjectError): string =>
  Match.value(error.reason).pipe(
    Match.when("invalid_key", () => "Use a key like notes/hello.txt (letters, numbers, . _ - /)."),
    Match.when("empty_content", () => "Add some content to store."),
    Match.when(
      "content_too_large",
      () => `Keep content under ${maxContentBytes / 1024} KB for this demo.`,
    ),
    Match.exhaustive,
  )

const formError = (message: string) =>
  datastarSignalsEffect(r2Form.patch({ errors: { form: message } }))

const objectListStream = (objects: readonly StoredObject[]) =>
  datastarStream([
    event.signals(r2Form.patch({ errors: { form: "" } })),
    event.patch(<ObjectList objects={objects} />),
  ])

const r2DemoPage = Effect.gen(function* () {
  const r2Objects = yield* R2Objects
  const objects = yield* annotateAction("r2", "list")(r2Objects.list, (objects) => ({
    count: objects.length,
  }))

  return datastarPage(
    <R2Page
      form={r2Form}
      objects={objects}
    />,
    {
      title: "R2 object store",
      head: pageHead(),
    },
  )
}).pipe(
  Effect.catchTag("R2ObjectsError", () =>
    Effect.succeed(HttpServerResponse.text("R2 demo unavailable", { status: 503 })),
  ),
  Effect.withSpan("r2Demo.page"),
)

const put = Effect.fn("r2Demo.put")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const signals = yield* decodeSignals(request, PutObjectSignals)
    const object = yield* parseObject(signals.key, signals.content)
    const r2Objects = yield* R2Objects
    const objects = yield* annotateAction("r2", "put")(
      Effect.gen(function* () {
        yield* r2Objects.put(object.key, object.content)
        return yield* r2Objects.list
      }),
      (objects) => ({ count: objects.length }),
    )

    return objectListStream(objects)
  },
  Effect.catchTags({
    InvalidSignalsError: () => formError("Could not read the form. Try again."),
    InvalidObjectError: (error) => formError(invalidObjectMessage(error)),
    R2ObjectsError: () => formError("Could not reach R2. Try again."),
  }),
)

const remove = Effect.fn("r2Demo.remove")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const signals = yield* decodeSignals(request, DeleteObjectSignals)
    const key = yield* parseObjectKey(signals.key)
    const r2Objects = yield* R2Objects
    const objects = yield* annotateAction("r2", "delete")(
      Effect.gen(function* () {
        yield* r2Objects.remove(key)
        return yield* r2Objects.list
      }),
      (objects) => ({ count: objects.length }),
    )

    return objectListStream(objects)
  },
  Effect.catchTags({
    InvalidSignalsError: () => formError("Could not read the request. Try again."),
    InvalidObjectError: () => formError("That object key is not valid."),
    R2ObjectsError: () => formError("Could not reach R2. Try again."),
  }),
)

const serveObject = Effect.fn("r2Demo.serveObject")(
  function* () {
    const params = yield* HttpRouter.schemaParams(ReadObjectParams)
    const key = yield* parseObjectKey(params.key)
    const r2Objects = yield* R2Objects
    const content = yield* annotateAction("r2", "read")(r2Objects.read(key), (content) => ({
      found: Option.isSome(content),
    }))

    return Option.match(content, {
      onNone: () => HttpServerResponse.text("Object not found", { status: 404 }),
      onSome: (value) => HttpServerResponse.text(value),
    })
  },
  Effect.catchTags({
    SchemaError: () => Effect.succeed(HttpServerResponse.text("Invalid key", { status: 400 })),
    InvalidObjectError: () =>
      Effect.succeed(HttpServerResponse.text("Invalid key", { status: 400 })),
    R2ObjectsError: () =>
      Effect.succeed(HttpServerResponse.text("R2 demo unavailable", { status: 503 })),
  }),
)

export const r2DemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/r2", r2DemoPage),
  HttpRouter.add("POST", "/r2/put", put),
  HttpRouter.add("POST", "/r2/delete", remove),
  HttpRouter.add("GET", "/r2/object", serveObject),
)
