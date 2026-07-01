import { Array, Context, Effect, Order, Schema } from "effect"
import { parseObjectKey, type ObjectContent, type ObjectKey } from "@/resources/r2-objects/object"

export type StoredObject = {
  readonly key: ObjectKey
  readonly size: number
  readonly uploaded: string
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
    readonly read: (key: ObjectKey) => Effect.Effect<string | null, R2ObjectsError>
    readonly remove: (key: ObjectKey) => Effect.Effect<void, R2ObjectsError>
  }
>()("boilerplate/resources/r2-objects/R2Objects") {}

export function makeR2Objects(bucket: CloudflareBindings["APP_BUCKET"]): R2Objects["Service"] {
  const list = Effect.gen(function* () {
    const listed = yield* Effect.tryPromise({
      try: () => bucket.list(),
      catch: (cause) => new R2ObjectsError({ reason: "list_failed", cause }),
    })

    const objects = yield* Effect.forEach(listed.objects, (object) =>
      parseObjectKey(object.key).pipe(
        Effect.mapError((cause) => new R2ObjectsError({ reason: "list_failed", cause })),
        Effect.map((key) => ({
          key,
          size: object.size,
          uploaded: object.uploaded.toISOString(),
        })),
      ),
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
      if (object === null) return null

      return yield* Effect.tryPromise({
        try: () => object.text(),
        catch: (cause) => new R2ObjectsError({ reason: "read_failed", cause }),
      })
    }).pipe(Effect.withSpan("R2Objects.read"))

  const remove = (key: ObjectKey) =>
    Effect.tryPromise({
      try: () => bucket.delete(key),
      catch: (cause) => new R2ObjectsError({ reason: "delete_failed", cause }),
    }).pipe(Effect.withSpan("R2Objects.remove"))

  return R2Objects.of({ list, put, read, remove })
}
