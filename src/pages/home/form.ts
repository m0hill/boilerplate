import { Schema } from "effect"
import { state } from "datastar-kit"

/** Message shown when a repository field is not in `owner/repo` form. */
export const invalidRepoMessage = "Use the owner/repo format, e.g. mswjs/cloudflare"

/** Maximum number of repositories allowed on the compare board. */
export const maxCompareRepos = 4

const defaultCompareRepos: readonly string[] = []

/** Datastar signal tree backing the lookup form and compare board. */
export const lookupForm = state({
  repo: "mswjs/cloudflare",
  compareRepos: defaultCompareRepos,
  errors: {
    repo: "",
    compare: "",
  },
})

const RepoName = Schema.Trim.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/))

/** Signals accepted by the `/lookup` route. */
export const RepoSignals = Schema.Struct({
  repo: RepoName,
})

/** Signals accepted by the `/compare/*` routes. */
export const CompareBoardSignals = Schema.Struct({
  repo: RepoName,
  compareRepos: Schema.optionalKey(
    Schema.Array(RepoName).check(Schema.isMaxLength(maxCompareRepos)),
  ),
})
