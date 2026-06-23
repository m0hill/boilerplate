import { Effect, Layer, Result, Schema } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { event, read, reply } from "datastar-kit"
import { SITE_TITLE } from "../../constants.js"
import { pageHead } from "../../ui/head.js"
import {
  CompareBoardSignals,
  invalidRepoMessage,
  lookupForm,
  maxCompareRepos,
  RepoSignals,
} from "./form.js"
import { fetchRepoStats } from "./github.js"
import { fetchCompareRepos, repoParts, uniqueRepoNames } from "./repos.js"
import { CompareBoard, HomeMain, LookupResult } from "./views.js"

/** Narrows the platform request source to the Web `Request` datastar-kit reads. */
const webRequestOf = (request: HttpServerRequest.HttpServerRequest): Request => {
  if (request.source instanceof Request) return request.source
  throw new Error("Expected a Web Request as the HTTP server request source")
}

const homePage = Effect.gen(function* () {
  yield* Effect.annotateLogsScoped({ page: { name: "home" } })

  return HttpServerResponse.raw(
    reply.page(<HomeMain />, {
      title: SITE_TITLE,
      head: pageHead(),
    }),
  )
})

const lookup = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const signals = yield* Effect.promise(() => read.signals(webRequestOf(request)))
    const parsed = yield* Effect.result(Schema.decodeUnknownEffect(RepoSignals)(signals))

    const invalid = Effect.gen(function* () {
      yield* Effect.annotateLogsScoped({ lookup: { ok: false, reason: "invalid_repo" } })
      return HttpServerResponse.raw(
        reply.stream([
          event.signals(lookupForm.patch({ errors: { repo: invalidRepoMessage } })),
          event.patch(<LookupResult />),
        ]),
      )
    })

    if (Result.isFailure(parsed)) return yield* invalid

    const parts = repoParts(parsed.success.repo)
    if (parts === undefined) return yield* invalid

    const found = yield* Effect.result(fetchRepoStats(parts.owner, parts.repo))
    if (Result.isFailure(found)) {
      const error = found.failure
      const message =
        error._tag === "RepoNotFoundError"
          ? `Repository ${error.owner}/${error.repo} not found`
          : "Could not reach GitHub. Try again."
      yield* Effect.annotateLogsScoped({ lookup: { ok: false, reason: "fetch_failed" } })
      return HttpServerResponse.raw(
        reply.stream([
          event.signals(lookupForm.patch({ errors: { repo: message } })),
          event.patch(<LookupResult />),
        ]),
      )
    }

    yield* Effect.annotateLogsScoped({
      lookup: { ok: true, repo: found.success.fullName, stars: found.success.stars },
    })
    return HttpServerResponse.raw(
      reply.stream([
        event.signals(lookupForm.patch({ errors: { repo: "" } })),
        event.patch(<LookupResult result={found.success} />),
      ]),
    )
  })

const compareAdd = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const signals = yield* Effect.promise(() => read.signals(webRequestOf(request)))
    const parsed = yield* Effect.result(Schema.decodeUnknownEffect(CompareBoardSignals)(signals))

    if (Result.isFailure(parsed)) {
      yield* Effect.annotateLogsScoped({ compare: { ok: false, reason: "invalid_repo" } })
      return HttpServerResponse.raw(
        reply.signals(
          lookupForm.patch({ errors: { compare: "Choose a valid repository to compare." } }),
        ),
      )
    }

    const repoNames = uniqueRepoNames([...(parsed.success.compareRepos ?? []), parsed.success.repo])
    if (repoNames.length > maxCompareRepos) {
      yield* Effect.annotateLogsScoped({ compare: { ok: false, reason: "too_many_repos" } })
      return HttpServerResponse.raw(
        reply.signals(
          lookupForm.patch({
            errors: { compare: `Compare up to ${maxCompareRepos} repositories.` },
          }),
        ),
      )
    }

    const result = yield* Effect.result(fetchCompareRepos(repoNames))
    if (Result.isFailure(result)) {
      yield* Effect.annotateLogsScoped({ compare: { ok: false, reason: "fetch_failed" } })
      return HttpServerResponse.raw(
        reply.signals(
          lookupForm.patch({
            errors: { compare: "Could not refresh the compare board. Try again." },
          }),
        ),
      )
    }

    const repos = result.success
    const compareRepos = repos.map((repo) => repo.fullName)
    yield* Effect.annotateLogsScoped({ compare: { ok: true, repos: compareRepos.length } })
    return HttpServerResponse.raw(
      reply.stream([
        event.signals(lookupForm.patch({ compareRepos, errors: { compare: "" } })),
        event.patch(<CompareBoard repos={repos} />),
      ]),
    )
  })

const compareRemove = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const signals = yield* Effect.promise(() => read.signals(webRequestOf(request)))
    const parsed = yield* Effect.result(Schema.decodeUnknownEffect(CompareBoardSignals)(signals))

    if (Result.isFailure(parsed)) {
      yield* Effect.annotateLogsScoped({ compare: { ok: false, reason: "invalid_repo" } })
      return HttpServerResponse.raw(
        reply.signals(
          lookupForm.patch({ errors: { compare: "Choose a valid repository to remove." } }),
        ),
      )
    }

    const removedKey = parsed.success.repo.toLowerCase()
    const repoNames = uniqueRepoNames(parsed.success.compareRepos ?? []).filter(
      (repoName) => repoName.toLowerCase() !== removedKey,
    )

    const result = yield* Effect.result(fetchCompareRepos(repoNames))
    if (Result.isFailure(result)) {
      yield* Effect.annotateLogsScoped({ compare: { ok: false, reason: "fetch_failed" } })
      return HttpServerResponse.raw(
        reply.signals(
          lookupForm.patch({
            errors: { compare: "Could not refresh the compare board. Try again." },
          }),
        ),
      )
    }

    const repos = result.success
    const compareRepos = repos.map((repo) => repo.fullName)
    yield* Effect.annotateLogsScoped({ compare: { ok: true, repos: compareRepos.length } })
    return HttpServerResponse.raw(
      reply.stream([
        event.signals(lookupForm.patch({ compareRepos, errors: { compare: "" } })),
        event.patch(<CompareBoard repos={repos} />),
      ]),
    )
  })

/** Routes for the GitHub repo-lookup demo page. */
export const homeRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/", homePage),
  HttpRouter.add("POST", "/lookup", lookup),
  HttpRouter.add("POST", "/compare/add", compareAdd),
  HttpRouter.add("POST", "/compare/remove", compareRemove),
)
