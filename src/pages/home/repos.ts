import { Effect } from "effect"
import { GitHubRepos } from "./github.js"
import type { RepoName } from "./repo-name.js"

/** Fetches stats for every repository on the compare board, concurrently. */
export const fetchCompareRepos = Effect.fn("fetchCompareRepos")(function* (
  repoNames: readonly RepoName[],
) {
  const github = yield* GitHubRepos
  return yield* Effect.all(
    repoNames.map((repoName) => github.fetch(repoName)),
    {
      concurrency: "unbounded",
    },
  )
})
