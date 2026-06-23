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

const lookupError = Effect.fnUntraced(function* (
  reason: "invalid_repo" | "fetch_failed",
  message: string,
) {
  yield* Effect.annotateLogsScoped({ lookup: { ok: false, reason } })
  return HttpServerResponse.raw(
    reply.stream([
      event.signals(lookupForm.patch({ errors: { repo: message } })),
      event.patch(<LookupResult />),
    ]),
  )
})

const lookupProgram = Effect.fnUntraced(function* (request: HttpServerRequest.HttpServerRequest) {
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
})

const lookup = (request: HttpServerRequest.HttpServerRequest) =>
  lookupProgram(request).pipe(
    Effect.catchTags({
      InvalidSignalsError: () => lookupError("invalid_repo", invalidRepoMessage),
      InvalidRepoNameError: () => lookupError("invalid_repo", invalidRepoMessage),
      RepoNotFoundError: (error) =>
        lookupError("fetch_failed", `Repository ${error.owner}/${error.repo} not found`),
      GitHubUnavailableError: () =>
        lookupError("fetch_failed", "Could not reach GitHub. Try again."),
    }),
  )

const compareError = Effect.fnUntraced(function* (
  reason: "invalid_repo" | "too_many_repos" | "fetch_failed",
  message: string,
) {
  yield* Effect.annotateLogsScoped({ compare: { ok: false, reason } })
  return HttpServerResponse.raw(reply.signals(lookupForm.patch({ errors: { compare: message } })))
})

const compareSuccess = Effect.fnUntraced(function* (repos: readonly Repo[]) {
  const compareRepos = repos.map((repo) => repo.fullName)
  yield* Effect.annotateLogsScoped({ compare: { ok: true, repos: compareRepos.length } })
  return HttpServerResponse.raw(
    reply.stream([
      event.signals(lookupForm.patch({ compareRepos, errors: { compare: "" } })),
      event.patch(<CompareBoard repos={repos} />),
    ]),
  )
})

const decodeCompareRequest = Effect.fnUntraced(function* (
  request: HttpServerRequest.HttpServerRequest,
) {
  const signals = yield* decodeSignals(request, CompareBoardSignals)
  const repo = yield* parseRepoName(signals.repo)
  const compareRepos = yield* parseRepoNames(signals.compareRepos ?? [])
  return { repo, compareRepos }
})

const compareAddProgram = Effect.fnUntraced(function* (
  request: HttpServerRequest.HttpServerRequest,
) {
  const { repo, compareRepos } = yield* decodeCompareRequest(request)
  const repoNames = yield* addCompareRepo(compareRepos, repo)
  const repos = yield* fetchCompareRepos(repoNames)

  return yield* compareSuccess(repos)
})

const compareAdd = (request: HttpServerRequest.HttpServerRequest) =>
  compareAddProgram(request).pipe(
    Effect.catchTags({
      InvalidSignalsError: () =>
        compareError("invalid_repo", "Choose a valid repository to compare."),
      InvalidRepoNameError: () =>
        compareError("invalid_repo", "Choose a valid repository to compare."),
      CompareBoardFullError: (error) =>
        compareError("too_many_repos", `Compare up to ${error.max} repositories.`),
      RepoNotFoundError: () =>
        compareError("fetch_failed", "Could not refresh the compare board. Try again."),
      GitHubUnavailableError: () =>
        compareError("fetch_failed", "Could not refresh the compare board. Try again."),
    }),
  )

const compareRemoveProgram = Effect.fnUntraced(function* (
  request: HttpServerRequest.HttpServerRequest,
) {
  const { repo, compareRepos } = yield* decodeCompareRequest(request)
  const repoNames = removeCompareRepo(compareRepos, repo)
  const repos = yield* fetchCompareRepos(repoNames)

  return yield* compareSuccess(repos)
})

const compareRemove = (request: HttpServerRequest.HttpServerRequest) =>
  compareRemoveProgram(request).pipe(
    Effect.catchTags({
      InvalidSignalsError: () =>
        compareError("invalid_repo", "Choose a valid repository to remove."),
      InvalidRepoNameError: () =>
        compareError("invalid_repo", "Choose a valid repository to remove."),
      RepoNotFoundError: () =>
        compareError("fetch_failed", "Could not refresh the compare board. Try again."),
      GitHubUnavailableError: () =>
        compareError("fetch_failed", "Could not refresh the compare board. Try again."),
    }),
  )

/** Routes for the GitHub repo-lookup demo page. */
export const homeRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/", homePage),
  HttpRouter.add("POST", "/lookup", lookup),
  HttpRouter.add("POST", "/compare/add", compareAdd),
  HttpRouter.add("POST", "/compare/remove", compareRemove),
)
