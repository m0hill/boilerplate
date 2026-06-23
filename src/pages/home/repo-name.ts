import { Effect, Schema } from "effect"

export type RepoName = {
  readonly owner: string
  readonly repo: string
  readonly fullName: string
}

/** A repository name was not supplied in `owner/repo` form. */
export class InvalidRepoNameError extends Schema.TaggedErrorClass<InvalidRepoNameError>()(
  "InvalidRepoNameError",
  {
    input: Schema.String,
  },
) {}

const repoPartPattern = /^[\w.-]+$/

/** Parses and normalizes a GitHub repository name from user input. */
export const parseRepoName = Effect.fn("parseRepoName")(function* (
  input: string,
): Effect.fn.Return<RepoName, InvalidRepoNameError> {
  const fullName = input.trim()
  const [owner = "", repo = "", extra] = fullName.split("/")

  if (extra !== undefined || !repoPartPattern.test(owner) || !repoPartPattern.test(repo)) {
    return yield* new InvalidRepoNameError({ input })
  }

  return { owner, repo, fullName: `${owner}/${repo}` }
})

export const parseRepoNames = Effect.fn("parseRepoNames")(function* (
  inputs: readonly string[],
): Effect.fn.Return<readonly RepoName[], InvalidRepoNameError> {
  return yield* Effect.all(inputs.map(parseRepoName))
})

/** Removes duplicate repository names, comparing case-insensitively. */
export const uniqueRepoNames = (names: readonly RepoName[]): readonly RepoName[] => {
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
