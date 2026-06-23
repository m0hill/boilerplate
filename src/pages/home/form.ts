import { Schema } from "effect"
import { state } from "datastar-kit"
import { maxCompareRepos } from "./compare-board.js"

/** Message shown when a repository field is not in `owner/repo` form. */
export const invalidRepoMessage = "Use the owner/repo format, e.g. mswjs/cloudflare"

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

const RepoInput = Schema.Trim.check(Schema.isMinLength(1))

/** Signals accepted by the `/lookup` route. */
export const RepoSignals = Schema.Struct({
  repo: RepoInput,
})

/** Signals accepted by the `/compare/*` routes. */
export const CompareBoardSignals = Schema.Struct({
  repo: RepoInput,
  compareRepos: Schema.optionalKey(
    Schema.Array(RepoInput).check(Schema.isMaxLength(maxCompareRepos)),
  ),
})
