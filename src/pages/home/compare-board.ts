import { Data, Effect } from "effect"
import { uniqueRepoNames, type RepoName } from "./repo-name.js"

/** Maximum number of repositories allowed on the compare board. */
export const maxCompareRepos = 4

/** The compare board already has the maximum number of repositories. */
export class CompareBoardFullError extends Data.TaggedError("CompareBoardFullError")<{
  readonly max: number
}> {}

export const addCompareRepo = (
  current: readonly RepoName[],
  repo: RepoName,
): Effect.Effect<readonly RepoName[], CompareBoardFullError> => {
  const repoNames = uniqueRepoNames([...current, repo])
  if (repoNames.length > maxCompareRepos) {
    return Effect.fail(new CompareBoardFullError({ max: maxCompareRepos }))
  }

  return Effect.succeed(repoNames)
}

export const removeCompareRepo = (
  current: readonly RepoName[],
  repo: RepoName,
): readonly RepoName[] => {
  const removedKey = repo.fullName.toLowerCase()
  return uniqueRepoNames(current).filter(
    (repoName) => repoName.fullName.toLowerCase() !== removedKey,
  )
}
