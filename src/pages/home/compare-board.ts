import { Effect, Schema } from "effect"
import { uniqueRepoNames, type RepoName } from "./repo-name.js"

/** Maximum number of repositories allowed on the compare board. */
export const maxCompareRepos = 4

/** The compare board already has the maximum number of repositories. */
export class CompareBoardFullError extends Schema.TaggedErrorClass<CompareBoardFullError>()(
  "CompareBoardFullError",
  {
    max: Schema.Int,
  },
) {}

export const addCompareRepo = Effect.fn("addCompareRepo")(function* (
  current: readonly RepoName[],
  repo: RepoName,
): Effect.fn.Return<readonly RepoName[], CompareBoardFullError> {
  const repoNames = uniqueRepoNames([...current, repo])
  if (repoNames.length > maxCompareRepos) {
    return yield* new CompareBoardFullError({ max: maxCompareRepos })
  }

  return repoNames
})

export const removeCompareRepo = (
  current: readonly RepoName[],
  repo: RepoName,
): readonly RepoName[] => {
  const removedKey = repo.fullName.toLowerCase()
  return uniqueRepoNames(current).filter(
    (repoName) => repoName.fullName.toLowerCase() !== removedKey,
  )
}
