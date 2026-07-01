import { Effect, Schema } from "effect"

const repoPartPattern = /^[\w.-]+$/

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

export const parseRepoName = Effect.fn("parseRepoName")(function* (
  input: string,
): Effect.fn.Return<RepoName, InvalidRepoNameError> {
  const fullName = input.trim()
  const [owner = "", repo = "", extra] = fullName.split("/")

  if (extra !== undefined) {
    return yield* new InvalidRepoNameError({ input })
  }

  return yield* Schema.decodeUnknownEffect(RepoName)({
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  }).pipe(Effect.mapError(() => new InvalidRepoNameError({ input })))
})
