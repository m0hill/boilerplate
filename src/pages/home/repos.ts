import { Effect } from "effect"
import { fetchRepoStats } from "./github.js"
import type { RepoName } from "./repo-name.js"

/** Fetches stats for every repository on the compare board, concurrently. */
export const fetchCompareRepos = (repoNames: readonly RepoName[]) =>
  Effect.all(repoNames.map(fetchRepoStats), { concurrency: "unbounded" })
