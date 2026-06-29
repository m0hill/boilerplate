import { Context, Effect, Layer, Schema, flow } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import type { RepoName } from "@/services/github-repos/repo-name"

const userAgent = "boilerplate-worker"

export class Repo extends Schema.Class<Repo>("Repo")({
  fullName: Schema.String.check(Schema.isMinLength(1)),
  stars: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  forks: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  openIssues: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  language: Schema.NullOr(Schema.String.check(Schema.isMinLength(1))),
}) {}

const RepoResponse = Schema.Struct({
  full_name: Schema.String.check(Schema.isMinLength(1)),
  stargazers_count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  forks_count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  open_issues_count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  language: Schema.NullOr(Schema.String.check(Schema.isMinLength(1))),
})

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
>()("boilerplate/services/github-repos/GitHubRepos") {
  static readonly layer = Layer.effect(
    GitHubRepos,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(
          flow(
            HttpClientRequest.prependUrl("https://api.github.com/repos"),
            HttpClientRequest.setHeaders({
              "user-agent": userAgent,
              accept: "application/vnd.github+json",
            }),
          ),
        ),
      )

      const fetch = Effect.fn("GitHubRepos.fetch")(function* (
        repoName: RepoName,
      ): Effect.fn.Return<Repo, RepoNotFoundError | GitHubUnavailableError> {
        const response = yield* client
          .get(`/${repoName.owner}/${repoName.repo}`)
          .pipe(
            Effect.mapError(
              (cause) => new GitHubUnavailableError({ reason: "request_failed", cause }),
            ),
          )

        if (response.status === 404) {
          return yield* new RepoNotFoundError({ owner: repoName.owner, repo: repoName.repo })
        }
        if (response.status >= 400) {
          return yield* new GitHubUnavailableError({
            reason: "unexpected_status",
            status: response.status,
          })
        }

        const data = yield* HttpClientResponse.schemaBodyJson(RepoResponse)(response).pipe(
          Effect.mapError((cause) => new GitHubUnavailableError({ reason: "invalid_body", cause })),
        )

        return new Repo({
          fullName: data.full_name,
          stars: data.stargazers_count,
          forks: data.forks_count,
          openIssues: data.open_issues_count,
          language: data.language,
        })
      })

      return GitHubRepos.of({ fetch })
    }),
  )
}
