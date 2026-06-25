import { Context, Effect, Schema } from "effect"

type Bucket = CloudflareBindings["APP_BUCKET"]

export type StoredObject = {
  readonly key: string
  readonly size: number
  readonly uploaded: string
}

export class R2StoreError extends Schema.TaggedErrorClass<R2StoreError>()("R2StoreError", {
  reason: Schema.Literals(["list_failed", "put_failed", "read_failed", "delete_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class R2ObjectStore extends Context.Service<
  R2ObjectStore,
  {
    readonly list: Effect.Effect<readonly StoredObject[], R2StoreError>
    readonly put: (key: string, content: string) => Effect.Effect<void, R2StoreError>
    readonly read: (key: string) => Effect.Effect<string | null, R2StoreError>
    readonly remove: (key: string) => Effect.Effect<void, R2StoreError>
  }
>()("boilerplate/pages/r2-demo/R2ObjectStore") {}

export function makeR2ObjectStore(bucket: Bucket): R2ObjectStore["Service"] {
  const list = Effect.gen(function* () {
    const listed = yield* Effect.tryPromise({
      try: () => bucket.list(),
      catch: (cause) => new R2StoreError({ reason: "list_failed", cause }),
    })

    return listed.objects
      .map((object) => ({
        key: object.key,
        size: object.size,
        uploaded: object.uploaded.toISOString(),
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }).pipe(Effect.withSpan("R2ObjectStore.list"))

  const put = (key: string, content: string) =>
    Effect.tryPromise({
      try: () =>
        bucket.put(key, content, {
          httpMetadata: { contentType: "text/plain; charset=utf-8" },
        }),
      catch: (cause) => new R2StoreError({ reason: "put_failed", cause }),
    }).pipe(Effect.asVoid, Effect.withSpan("R2ObjectStore.put"))

  const read = (key: string) =>
    Effect.gen(function* () {
      const object = yield* Effect.tryPromise({
        try: () => bucket.get(key),
        catch: (cause) => new R2StoreError({ reason: "read_failed", cause }),
      })
      if (object === null) return null

      return yield* Effect.tryPromise({
        try: () => object.text(),
        catch: (cause) => new R2StoreError({ reason: "read_failed", cause }),
      })
    }).pipe(Effect.withSpan("R2ObjectStore.read"))

  const remove = (key: string) =>
    Effect.tryPromise({
      try: () => bucket.delete(key),
      catch: (cause) => new R2StoreError({ reason: "delete_failed", cause }),
    }).pipe(Effect.withSpan("R2ObjectStore.remove"))

  return R2ObjectStore.of({ list, put, read, remove })
}
