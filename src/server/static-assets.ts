import path from "node:path"
import { Effect, Layer, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

const assetNotFound = HttpServerResponse.text("Asset Not Found", { status: 404 })

const serveAsset = (publicDirectory: string) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const url = HttpServerRequest.toURL(request)
    const pathname = Option.match(url, {
      onNone: () => request.url,
      onSome: (value) => value.pathname,
    })
    const resolvedPublicDirectory = path.resolve(publicDirectory)
    const filePath = path.resolve(resolvedPublicDirectory, `.${pathname}`)

    if (!filePath.startsWith(`${resolvedPublicDirectory}${path.sep}`)) {
      return assetNotFound
    }

    return yield* HttpServerResponse.file(filePath).pipe(
      Effect.catchTag("PlatformError", () => Effect.succeed(assetNotFound)),
    )
  })

export const staticAssetRoutes = (publicDirectory: string) =>
  Layer.mergeAll(
    HttpRouter.add("GET", "/app.css", serveAsset(publicDirectory)),
    HttpRouter.add("GET", "/js/*", serveAsset(publicDirectory)),
  )
