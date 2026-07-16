import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { dotEnvFallbackLayer, ServerConfig } from "@/server/config"
import { migrateSqlite, sqliteMigrationDatabaseLayer } from "@/services/sqlite/database"

const main = migrateSqlite.pipe(
  Effect.provide(sqliteMigrationDatabaseLayer),
  Effect.provide(ServerConfig.layer),
  Effect.provide(dotEnvFallbackLayer),
  Effect.provide(NodeFileSystem.layer),
)

NodeRuntime.runMain(main)
