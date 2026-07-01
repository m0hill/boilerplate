import { Context, Effect, Schema } from "effect"
import type { RepoName } from "@/services/github-repos/repo-name"

const userAgent = "boilerplate-worker"

export class Repo extends Schema.Class<Repo>("Repo")({
  fullName: Schema.NonEmptyString,
  stars: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  forks: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  openIssues: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  language: Schema.OptionFromNullOr(Schema.NonEmptyString),
}) {}

const RepoResponse = Repo.pipe(
  Schema.encodeKeys({
    fullName: "full_name",
    stars: "stargazers_count",
    forks: "forks_count",
    openIssues: "open_issues_count",
  }),
)

export class RepoNotFoundError extends Schema.TaggedErrorClass<RepoNotFoundError>()(
  "RepoNotFoundError",
  {
    owner: Schema.String,
    repo: Schema.String,
  },
) {}

export class GitHubUnavailableError extends Schema.TaggedErrorClass<GitHubUnavailableError>()(
  "GitHubUnavailableError",
  {
    reason: Schema.Literals(["request_failed", "unexpected_status", "invalid_body"]),
    status: Schema.optionalKey(Schema.Int.check(Schema.isGreaterThanOrEqualTo(400))),
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

export class GitHubRepos extends Context.Service<
  GitHubRepos,
  {
    readonly fetch: (
      repoName: RepoName,
    ) => Effect.Effect<Repo, RepoNotFoundError | GitHubUnavailableError>
  }
>()("boilerplate/services/github-repos/GitHubRepos") {}

export function makeGitHubRepos(fetch: typeof globalThis.fetch): GitHubRepos["Service"] {
  const get = Effect.fn("GitHubRepos.fetch")(function* (
    repoName: RepoName,
  ): Effect.fn.Return<Repo, RepoNotFoundError | GitHubUnavailableError> {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`https://api.github.com/repos/${repoName.owner}/${repoName.repo}`, {
          headers: {
            "user-agent": userAgent,
            accept: "application/vnd.github+json",
          },
        }),
      catch: (cause) => new GitHubUnavailableError({ reason: "request_failed", cause }),
    })

    if (response.status === 404) {
      return yield* Effect.fail(
        new RepoNotFoundError({ owner: repoName.owner, repo: repoName.repo }),
      )
    }
    if (response.status >= 400) {
      return yield* Effect.fail(
        new GitHubUnavailableError({
          reason: "unexpected_status",
          status: response.status,
        }),
      )
    }

    const body = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) => new GitHubUnavailableError({ reason: "invalid_body", cause }),
    })

    return yield* Schema.decodeUnknownEffect(RepoResponse)(body).pipe(
      Effect.mapError((cause) => new GitHubUnavailableError({ reason: "invalid_body", cause })),
    )
  })

  return GitHubRepos.of({ fetch: get })
}
