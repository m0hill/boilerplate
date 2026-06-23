import { Data, Effect } from "effect"

export type RepoName = {
  readonly owner: string
  readonly repo: string
  readonly fullName: string
}

/** A repository name was not supplied in `owner/repo` form. */
export class InvalidRepoNameError extends Data.TaggedError("InvalidRepoNameError")<{
  readonly input: string
}> {}

const repoPartPattern = /^[\w.-]+$/

/** Parses and normalizes a GitHub repository name from user input. */
export const parseRepoName = (input: string): Effect.Effect<RepoName, InvalidRepoNameError> => {
  const fullName = input.trim()
  const [owner = "", repo = "", extra] = fullName.split("/")

  if (extra !== undefined || !repoPartPattern.test(owner) || !repoPartPattern.test(repo)) {
    return Effect.fail(new InvalidRepoNameError({ input }))
  }

  return Effect.succeed({ owner, repo, fullName: `${owner}/${repo}` })
}

export const parseRepoNames = (
  inputs: readonly string[],
): Effect.Effect<readonly RepoName[], InvalidRepoNameError> => Effect.all(inputs.map(parseRepoName))

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
