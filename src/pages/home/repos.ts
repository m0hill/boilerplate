import { Effect, Schema } from "effect"

const repoPartPattern = /^[\w.-]+$/

export const maxCompareRepos = 4

const RepoPart = Schema.String.check(Schema.isPattern(repoPartPattern))

export class RepoName extends Schema.Class<RepoName>("RepoName")({
  owner: RepoPart,
  repo: RepoPart,
  fullName: Schema.String.check(Schema.isMinLength(3)),
}) {}

export class InvalidRepoNameError extends Schema.TaggedErrorClass<InvalidRepoNameError>()(
  "InvalidRepoNameError",
  {
    input: Schema.String,
  },
) {}

export class CompareBoardFullError extends Schema.TaggedErrorClass<CompareBoardFullError>()(
  "CompareBoardFullError",
  {
    max: Schema.Int,
  },
) {}

const uniqueRepoNames = (names: readonly RepoName[]): readonly RepoName[] => {
  const seen = new Set<string>()
  const unique: RepoName[] = []

  for (const name of names) {
    const key = name.fullName.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    unique.push(name)
  }

  return unique
}

export const parseRepoName = Effect.fn("parseRepoName")(function* (
  input: string,
): Effect.fn.Return<RepoName, InvalidRepoNameError> {
  const fullName = input.trim()
  const [owner = "", repo = "", extra] = fullName.split("/")

  if (extra !== undefined || !repoPartPattern.test(owner) || !repoPartPattern.test(repo)) {
    return yield* new InvalidRepoNameError({ input })
  }

  return new RepoName({ owner, repo, fullName: `${owner}/${repo}` })
})

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
