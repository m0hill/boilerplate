import { event } from "datastar-kit"
import { Effect, Layer, Option } from "effect"
import { HttpRouter, HttpServerRequest } from "effect/unstable/http"
import {
  datastarPage,
  datastarStream,
  decodeSignals,
  type InvalidSignalsError,
} from "@/lib/datastar"
import { annotate, annotateAction } from "@/lib/observability/request-log"
import {
  GitHubRepos,
  type GitHubUnavailableError,
  type RepoNotFoundError,
} from "@/services/github-repos/github-repos"
import { type InvalidRepoNameError, parseRepoName } from "@/services/github-repos/repo-name"
import { pageHead } from "@/ui/head"
import { ApiPage } from "@/pages/api-demo/components/page"
import { RepoResult } from "@/pages/api-demo/components/repo-result"
import { LookupRepoSignals, lookupForm } from "@/pages/api-demo/state"

const invalidRepoMessage = "Use the owner/repo format, e.g. honojs/hono"

type LookupError =
  | InvalidSignalsError
  | InvalidRepoNameError
  | RepoNotFoundError
  | GitHubUnavailableError

const lookupFailureFields = (error: LookupError) => {
  switch (error._tag) {
    case "InvalidSignalsError":
      return { reason: "invalid_repo", cause: error.cause }
    case "InvalidRepoNameError":
      return { reason: "invalid_repo" }
    case "RepoNotFoundError":
      return { reason: "fetch_failed", owner: error.owner, repo: error.repo }
    case "GitHubUnavailableError":
      return {
        reason: "fetch_failed",
        githubReason: error.reason,
        ...(error.status === undefined ? {} : { status: error.status }),
        ...(error.cause === undefined ? {} : { cause: error.cause }),
      }
  }
}

const lookupFailed = (message: string) =>
  datastarStream([
    event.signals(lookupForm.patch({ errors: { repo: message } })),
    event.patch(<RepoResult result={Option.none()} />),
  ])

const apiDemoPage = Effect.gen(function* () {
  yield* annotate({ page: { name: "api" } })

  return datastarPage(<ApiPage form={lookupForm} />, {
    title: "External API",
    head: pageHead(),
  })
}).pipe(Effect.withSpan("apiDemo.page"))

const lookup = Effect.fn("apiDemo.lookup")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const result = yield* annotateAction("lookup", "lookup")(
      Effect.gen(function* () {
        const signals = yield* decodeSignals(request, LookupRepoSignals)
        const repoName = yield* parseRepoName(signals.repo)
        const github = yield* GitHubRepos

        return yield* github.fetch(repoName)
      }),
      {
        success: (result) => ({ repo: result.fullName, stars: result.stars }),
        failure: lookupFailureFields,
      },
    )

    return datastarStream([
      event.signals(lookupForm.patch({ errors: { repo: "" } })),
      event.patch(<RepoResult result={Option.some(result)} />),
    ])
  },
  Effect.catchTags({
    InvalidSignalsError: () => Effect.succeed(lookupFailed(invalidRepoMessage)),
    InvalidRepoNameError: () => Effect.succeed(lookupFailed(invalidRepoMessage)),
    RepoNotFoundError: (error) =>
      Effect.succeed(lookupFailed(`Repository ${error.owner}/${error.repo} not found`)),
    GitHubUnavailableError: () =>
      Effect.succeed(lookupFailed("Could not reach GitHub. Try again.")),
  }),
)

export const apiDemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/api", apiDemoPage),
  HttpRouter.add("POST", "/api/lookup", lookup),
)
