import { NodeFileSystem, NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { createServer } from "node:http"
import { AppLayer } from "@/app"
import { dotEnvFallbackLayer, ServerConfig } from "@/server/config"

const main = Effect.gen(function* () {
  const config = yield* ServerConfig
  const server = HttpRouter.serve(AppLayer, { disableLogger: true }).pipe(
    Layer.provide(
      NodeHttpServer.layer(createServer, {
        host: config.host,
        port: config.port,
      }),
    ),
  )

  return yield* Layer.launch(server)
}).pipe(
  Effect.provide(ServerConfig.layer),
  Effect.provide(dotEnvFallbackLayer),
  Effect.provide(NodeFileSystem.layer),
)

NodeRuntime.runMain(main)
