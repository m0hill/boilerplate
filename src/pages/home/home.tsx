import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { event, reply } from "datastar-kit"
import { SITE_TITLE } from "../../constants.js"
import { decodeSignals } from "../../http/datastar.js"
import { pageHead } from "../../ui/head.js"
import { addCompareRepo, removeCompareRepo } from "./compare-board.js"
import { CompareBoardSignals, invalidRepoMessage, lookupForm, RepoSignals } from "./form.js"
import { fetchRepoStats } from "./github.js"
import type { Repo } from "./github.js"
import { parseRepoName, parseRepoNames } from "./repo-name.js"
import { fetchCompareRepos } from "./repos.js"
import { CompareBoard, HomeMain, LookupResult } from "./views.js"

const homePage = Effect.gen(function* () {
  yield* Effect.annotateLogsScoped({ page: { name: "home" } })

  return HttpServerResponse.raw(
    reply.page(<HomeMain />, {
      title: SITE_TITLE,
      head: pageHead(),
    }),
  )
})

// --- /lookup: look up a single repository and patch the result panel ---

const lookupFailed = (reason: "invalid_repo" | "fetch_failed", message: string) =>
  Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ lookup: { ok: false, reason } })
    return HttpServerResponse.raw(
      reply.stream([
        event.signals(lookupForm.patch({ errors: { repo: message } })),
        event.patch(<LookupResult />),
      ]),
    )
  })

const lookup = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const signals = yield* decodeSignals(request, RepoSignals)
    const repoName = yield* parseRepoName(signals.repo)
    const result = yield* fetchRepoStats(repoName)

    yield* Effect.annotateLogsScoped({
      lookup: { ok: true, repo: result.fullName, stars: result.stars },
    })
    return HttpServerResponse.raw(
      reply.stream([
        event.signals(lookupForm.patch({ errors: { repo: "" } })),
        event.patch(<LookupResult result={result} />),
      ]),
    )
  }).pipe(
    Effect.catchTags({
      InvalidSignalsError: () => lookupFailed("invalid_repo", invalidRepoMessage),
      InvalidRepoNameError: () => lookupFailed("invalid_repo", invalidRepoMessage),
      RepoNotFoundError: (error) =>
        lookupFailed("fetch_failed", `Repository ${error.owner}/${error.repo} not found`),
      GitHubUnavailableError: () =>
        lookupFailed("fetch_failed", "Could not reach GitHub. Try again."),
    }),
  )

// --- /compare/add and /compare/remove: maintain the side-by-side compare board ---

const boardUnavailable = "Could not refresh the compare board. Try again."

const compareFailed = (
  reason: "invalid_repo" | "too_many_repos" | "fetch_failed",
  message: string,
) =>
  Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ compare: { ok: false, reason } })
    return HttpServerResponse.raw(reply.signals(lookupForm.patch({ errors: { compare: message } })))
  })

const compareUpdated = (repos: readonly Repo[]) =>
  Effect.gen(function* () {
    const compareRepos = repos.map((repo) => repo.fullName)
    yield* Effect.annotateLogsScoped({ compare: { ok: true, repos: compareRepos.length } })
    return HttpServerResponse.raw(
      reply.stream([
        event.signals(lookupForm.patch({ compareRepos, errors: { compare: "" } })),
        event.patch(<CompareBoard repos={repos} />),
      ]),
    )
  })

const decodeCompareRequest = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const signals = yield* decodeSignals(request, CompareBoardSignals)
    const repo = yield* parseRepoName(signals.repo)
    const compareRepos = yield* parseRepoNames(signals.compareRepos ?? [])
    return { repo, compareRepos }
  })

const compareAdd = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const { repo, compareRepos } = yield* decodeCompareRequest(request)
    const repoNames = yield* addCompareRepo(compareRepos, repo)
    const repos = yield* fetchCompareRepos(repoNames)

    return yield* compareUpdated(repos)
  }).pipe(
    Effect.catchTags({
      InvalidSignalsError: () =>
        compareFailed("invalid_repo", "Choose a valid repository to compare."),
      InvalidRepoNameError: () =>
        compareFailed("invalid_repo", "Choose a valid repository to compare."),
      CompareBoardFullError: (error) =>
        compareFailed("too_many_repos", `Compare up to ${error.max} repositories.`),
      RepoNotFoundError: () => compareFailed("fetch_failed", boardUnavailable),
      GitHubUnavailableError: () => compareFailed("fetch_failed", boardUnavailable),
    }),
  )

const compareRemove = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const { repo, compareRepos } = yield* decodeCompareRequest(request)
    const repos = yield* fetchCompareRepos(removeCompareRepo(compareRepos, repo))

    return yield* compareUpdated(repos)
  }).pipe(
    Effect.catchTags({
      InvalidSignalsError: () =>
        compareFailed("invalid_repo", "Choose a valid repository to remove."),
      InvalidRepoNameError: () =>
        compareFailed("invalid_repo", "Choose a valid repository to remove."),
      RepoNotFoundError: () => compareFailed("fetch_failed", boardUnavailable),
      GitHubUnavailableError: () => compareFailed("fetch_failed", boardUnavailable),
    }),
  )

/** Routes for the GitHub repo-lookup demo page. */
export const homeRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/", homePage),
  HttpRouter.add("POST", "/lookup", lookup),
  HttpRouter.add("POST", "/compare/add", compareAdd),
  HttpRouter.add("POST", "/compare/remove", compareRemove),
)
