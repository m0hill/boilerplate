import { Effect, Schema } from "effect"

const repoPartPattern = /^[\w.-]+$/
const RepoPart = Schema.String.check(Schema.isPattern(repoPartPattern))

/** Parsed GitHub repository name in `owner/repo` form. */
export class RepoName extends Schema.Class<RepoName>("RepoName")({
  owner: RepoPart,
  repo: RepoPart,
  fullName: Schema.String.check(Schema.isMinLength(3)),
}) {}

/** A repository name was not supplied in `owner/repo` form. */
export class InvalidRepoNameError extends Schema.TaggedErrorClass<InvalidRepoNameError>()(
  "InvalidRepoNameError",
  {
    input: Schema.String,
  },
) {}

/** Parses and normalizes a GitHub repository name from user input. */
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
