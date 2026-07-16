import { ConfigProvider, Effect } from "effect"
import { describe, expect, it } from "vitest"
import { ServerConfig } from "@/server/config"

const loadConfig = (env: Record<string, string>) =>
  Effect.runPromise(
    ServerConfig.pipe(
      Effect.provide(ServerConfig.layer),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env }))),
    ),
  )

describe("server configuration", () => {
  it("uses the approved defaults", async () => {
    await expect(loadConfig({})).resolves.toEqual({
      host: "0.0.0.0",
      port: 3000,
      databasePath: "./data/app.db",
    })
  })

  it("loads HOST, PORT, and DATABASE_PATH", async () => {
    await expect(
      loadConfig({ HOST: "127.0.0.1", PORT: "8080", DATABASE_PATH: "/tmp/app.db" }),
    ).resolves.toEqual({ host: "127.0.0.1", port: 8080, databasePath: "/tmp/app.db" })
  })

  it.each([
    ["an empty host", { HOST: "" }],
    ["an empty database path", { DATABASE_PATH: "" }],
    ["a non-numeric port", { PORT: "not-a-port" }],
    ["an out-of-range port", { PORT: "65536" }],
  ])("rejects %s", async (_name, env) => {
    await expect(loadConfig(env)).rejects.toBeDefined()
  })

  it("prefers actual environment values over dotenv values", async () => {
    const provider = ConfigProvider.fromEnv({ env: { PORT: "8080" } }).pipe(
      ConfigProvider.orElse(ConfigProvider.fromDotEnvContents("HOST=127.0.0.1\nPORT=4000")),
    )

    const result = await Effect.runPromise(
      ServerConfig.pipe(
        Effect.provide(ServerConfig.layer),
        Effect.provide(ConfigProvider.layer(provider)),
      ),
    )

    expect(result).toEqual({
      host: "127.0.0.1",
      port: 8080,
      databasePath: "./data/app.db",
    })
  })
})
