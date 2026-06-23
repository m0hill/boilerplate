import { Effect } from "effect"
import { fetchRepoStats } from "./github.js"
import type { RepoName } from "./repo-name.js"

/** Fetches stats for every repository on the compare board, concurrently. */
export const fetchCompareRepos = Effect.fn("fetchCompareRepos")(function* (
  repoNames: readonly RepoName[],
) {
  return yield* Effect.all(repoNames.map(fetchRepoStats), { concurrency: "unbounded" })
})
