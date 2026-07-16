import { Config, ConfigProvider, Context, Effect, Layer, Schema } from "effect"

const config = Config.all({
  host: Config.schema(Schema.NonEmptyString, "HOST").pipe(Config.withDefault("0.0.0.0")),
  port: Config.port("PORT").pipe(Config.withDefault(3000)),
  databasePath: Config.schema(Schema.NonEmptyString, "DATABASE_PATH").pipe(
    Config.withDefault("./data/app.db"),
  ),
})

export class ServerConfig extends Context.Service<ServerConfig, Config.Success<typeof config>>()(
  "boilerplate/server/ServerConfig",
) {
  static readonly layer = Layer.effect(ServerConfig, config)
}

const emptyProvider = ConfigProvider.fromEnv({ env: {} })

const dotEnvProvider = ConfigProvider.fromDotEnv().pipe(
  Effect.catchTag("PlatformError", (error) =>
    error.reason._tag === "NotFound" ? Effect.succeed(emptyProvider) : Effect.fail(error),
  ),
)

export const dotEnvFallbackLayer = ConfigProvider.layerAdd(dotEnvProvider)
