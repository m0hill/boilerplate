import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServerRequest } from "effect/unstable/http"
import { event } from "datastar-kit"
import { datastarPage, datastarStream, decodeSignals } from "../../datastar.js"
import { annotate } from "../../observability/request-log.js"
import { pageHead } from "../../ui/head.js"
import { GitHubRepos } from "./github.js"
import type { GitHubUnavailableError } from "./github.js"
import { parseRepoName } from "./repos.js"
import { ApiDemoMain, lookupForm, RepoResult } from "./views.js"

const invalidRepoMessage = "Use the owner/repo format, e.g. honojs/hono"

const RepoInput = Schema.Trim.check(Schema.isMinLength(1))

const LookupSignals = Schema.Struct({ repo: RepoInput })

const logGitHubUnavailable = (error: GitHubUnavailableError) =>
  annotate({
    github: { reason: error.reason, status: error.status, cause: error.cause },
  })

const lookupFailed = Effect.fn("apiDemo.lookupFailed")(function* (
  reason: "invalid_repo" | "fetch_failed",
  message: string,
) {
  yield* annotate({ lookup: { ok: false, reason } })
  return datastarStream([
    event.signals(lookupForm.patch({ errors: { repo: message } })),
    event.patch(<RepoResult />),
  ])
})

const apiDemoPage = Effect.gen(function* () {
  yield* annotate({ page: { name: "api" } })

  return datastarPage(<ApiDemoMain />, {
    title: "External API",
    head: pageHead(),
  })
}).pipe(Effect.withSpan("apiDemo.page"))

const lookup = Effect.fn("apiDemo.lookup")(
  function* (request: HttpServerRequest.HttpServerRequest) {
    const signals = yield* decodeSignals(request, LookupSignals)
    const repoName = yield* parseRepoName(signals.repo)
    const github = yield* GitHubRepos
    const result = yield* github.fetch(repoName)

    yield* annotate({
      lookup: { ok: true, repo: result.fullName, stars: result.stars },
    })
    return datastarStream([
      event.signals(lookupForm.patch({ errors: { repo: "" } })),
      event.patch(<RepoResult result={result} />),
    ])
  },
  Effect.tapErrorTag("GitHubUnavailableError", logGitHubUnavailable),
  Effect.catchTags({
    InvalidSignalsError: () => lookupFailed("invalid_repo", invalidRepoMessage),
    InvalidRepoNameError: () => lookupFailed("invalid_repo", invalidRepoMessage),
    RepoNotFoundError: (error) =>
      lookupFailed("fetch_failed", `Repository ${error.owner}/${error.repo} not found`),
    GitHubUnavailableError: () =>
      lookupFailed("fetch_failed", "Could not reach GitHub. Try again."),
  }),
)

export const apiDemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/api", apiDemoPage),
  HttpRouter.add("POST", "/api/lookup", lookup),
)
