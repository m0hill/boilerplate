import { Array, Context, DateTime, Effect, Option, Order, Schema } from "effect"
import { parseObjectKey, type ObjectContent, type ObjectKey } from "@/resources/r2-objects/object"

export type StoredObject = {
  readonly key: ObjectKey
  readonly size: number
  readonly uploaded: DateTime.Utc
}

export class R2ObjectsError extends Schema.TaggedErrorClass<R2ObjectsError>()("R2ObjectsError", {
  reason: Schema.Literals(["list_failed", "put_failed", "read_failed", "delete_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class R2Objects extends Context.Service<
  R2Objects,
  {
    readonly list: Effect.Effect<readonly StoredObject[], R2ObjectsError>
    readonly put: (key: ObjectKey, content: ObjectContent) => Effect.Effect<void, R2ObjectsError>
    readonly putAndList: (
      key: ObjectKey,
      content: ObjectContent,
    ) => Effect.Effect<readonly StoredObject[], R2ObjectsError>
    readonly read: (key: ObjectKey) => Effect.Effect<Option.Option<string>, R2ObjectsError>
    readonly remove: (key: ObjectKey) => Effect.Effect<void, R2ObjectsError>
    readonly removeAndList: (
      key: ObjectKey,
    ) => Effect.Effect<readonly StoredObject[], R2ObjectsError>
  }
>()("boilerplate/resources/r2-objects/R2Objects") {}

const decodeUploaded = (uploaded: Date): Effect.Effect<DateTime.Utc, R2ObjectsError> =>
  Schema.decodeUnknownEffect(Schema.DateTimeUtcFromDate)(uploaded).pipe(
    Effect.mapError((cause) => new R2ObjectsError({ reason: "list_failed", cause })),
  )

export function makeR2Objects(bucket: CloudflareBindings["APP_BUCKET"]): R2Objects["Service"] {
  const list = Effect.gen(function* () {
    const listed = yield* Effect.tryPromise({
      try: () => bucket.list(),
      catch: (cause) => new R2ObjectsError({ reason: "list_failed", cause }),
    })

    const objects = yield* Effect.forEach(listed.objects, (object) =>
      Effect.gen(function* () {
        const key = yield* parseObjectKey(object.key).pipe(
          Effect.mapError((cause) => new R2ObjectsError({ reason: "list_failed", cause })),
        )
        const uploaded = yield* decodeUploaded(object.uploaded)

        return {
          key,
          size: object.size,
          uploaded,
        }
      }),
    )

    return Array.sort(
      objects,
      Order.mapInput(Order.String, (object: StoredObject) => object.key),
    )
  }).pipe(Effect.withSpan("R2Objects.list"))

  const put = (key: ObjectKey, content: ObjectContent) =>
    Effect.tryPromise({
      try: () =>
        bucket.put(key, content, {
          httpMetadata: { contentType: "text/plain; charset=utf-8" },
        }),
      catch: (cause) => new R2ObjectsError({ reason: "put_failed", cause }),
    }).pipe(Effect.asVoid, Effect.withSpan("R2Objects.put"))

  const read = (key: ObjectKey) =>
    Effect.gen(function* () {
      const object = yield* Effect.tryPromise({
        try: () => bucket.get(key),
        catch: (cause) => new R2ObjectsError({ reason: "read_failed", cause }),
      })
      return yield* Option.match(Option.fromNullOr(object), {
        onNone: () => Effect.succeed(Option.none<string>()),
        onSome: (object) =>
          Effect.tryPromise({
            try: () => object.text(),
            catch: (cause) => new R2ObjectsError({ reason: "read_failed", cause }),
          }).pipe(Effect.map(Option.some)),
      })
    }).pipe(Effect.withSpan("R2Objects.read"))

  const remove = (key: ObjectKey) =>
    Effect.tryPromise({
      try: () => bucket.delete(key),
      catch: (cause) => new R2ObjectsError({ reason: "delete_failed", cause }),
    }).pipe(Effect.withSpan("R2Objects.remove"))

  const putAndList = (key: ObjectKey, content: ObjectContent) =>
    Effect.gen(function* () {
      yield* put(key, content)
      return yield* list
    }).pipe(Effect.withSpan("R2Objects.putAndList"))

  const removeAndList = (key: ObjectKey) =>
    Effect.gen(function* () {
      yield* remove(key)
      return yield* list
    }).pipe(Effect.withSpan("R2Objects.removeAndList"))

  return R2Objects.of({ list, put, putAndList, read, remove, removeAndList })
}
