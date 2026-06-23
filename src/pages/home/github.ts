import { Data, Effect, Schema } from "effect"
import { HttpClient, HttpClientResponse } from "effect/unstable/http"
import type { RepoName } from "./repo-name.js"

export type Repo = {
  readonly fullName: string
  readonly stars: number
  readonly forks: number
  readonly openIssues: number
  readonly language: string | null
}

/** The requested repository does not exist on GitHub. */
export class RepoNotFoundError extends Data.TaggedError("RepoNotFoundError")<{
  readonly owner: string
  readonly repo: string
}> {}

/** GitHub could not be reached, replied with an error, or returned an unexpected body. */
export class GitHubUnavailableError extends Data.TaggedError("GitHubUnavailableError")<{
  readonly reason: string
}> {}

const RepoResponse = Schema.Struct({
  full_name: Schema.String.check(Schema.isMinLength(1)),
  stargazers_count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  forks_count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  open_issues_count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  language: Schema.NullOr(Schema.String.check(Schema.isMinLength(1))),
})

const USER_AGENT = "boilerplate-worker"

/**
 * Fetches public repository stats from the GitHub REST API.
 *
 * Expected failures are modelled in the error channel: a missing repository as
 * {@link RepoNotFoundError}, any transport/HTTP/parse problem as
 * {@link GitHubUnavailableError}. Requires an {@link HttpClient.HttpClient}.
 */
export const fetchRepoStats = (
  repoName: RepoName,
): Effect.Effect<Repo, RepoNotFoundError | GitHubUnavailableError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const response = yield* HttpClient.get(
      `https://api.github.com/repos/${repoName.owner}/${repoName.repo}`,
      {
        headers: {
          "user-agent": USER_AGENT,
          accept: "application/vnd.github+json",
        },
      },
    ).pipe(Effect.mapError(() => new GitHubUnavailableError({ reason: "request_failed" })))

    if (response.status === 404) {
      return yield* new RepoNotFoundError({ owner: repoName.owner, repo: repoName.repo })
    }
    if (response.status >= 400) {
      return yield* new GitHubUnavailableError({ reason: `status_${response.status}` })
    }

    const data = yield* HttpClientResponse.schemaBodyJson(RepoResponse)(response).pipe(
      Effect.mapError(() => new GitHubUnavailableError({ reason: "invalid_body" })),
    )

    return {
      fullName: data.full_name,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
    }
  })
