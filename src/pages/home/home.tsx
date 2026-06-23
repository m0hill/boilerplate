import { Hono } from "hono"
import { Effect, Result, Schema } from "effect"
import { event, mod, post, read, reply, state } from "datastar-kit"
import type { AppEnv } from "../../app-env.js"
import { SITE_TITLE } from "../../constants.js"
import { runtime } from "../../runtime.js"
import { pageHead } from "../../ui/head.js"
import { fetchRepoStats, GitHubUnavailableError, type Repo } from "./github.js"

const invalidRepoMessage = "Use the owner/repo format, e.g. mswjs/cloudflare"

const defaultCompareRepos: readonly string[] = []
const maxCompareRepos = 4

const lookupForm = state({
  repo: "mswjs/cloudflare",
  compareRepos: defaultCompareRepos,
  errors: {
    repo: "",
    compare: "",
  },
})

const RepoName = Schema.Trim.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/))

const RepoSignals = Schema.Struct({
  repo: RepoName,
})

const CompareBoardSignals = Schema.Struct({
  repo: RepoName,
  compareRepos: Schema.optionalKey(
    Schema.Array(RepoName).check(Schema.isMaxLength(maxCompareRepos)),
  ),
})

const formatCount = (value: number): string => value.toLocaleString()

const pluralizedStat = (value: number, singular: string, plural: string): string =>
  `${formatCount(value)} ${value === 1 ? singular : plural}`

const Stars = ({ result }: { result?: Repo }) => (
  <output id="stars" class="text-xl">
    {result ? `${result.fullName} · ${formatCount(result.stars)} ★` : "—"}
  </output>
)

const LookupResult = ({ result }: { result?: Repo }) => (
  <section id="lookup-result" class="rounded border border-gray-200 p-4">
    {result === undefined ? (
      <p class="text-xl">
        Stars: <Stars />
      </p>
    ) : (
      <article class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">Lookup result</h2>
        <p class="text-xl">
          <Stars result={result} />
        </p>
        <p class="text-sm text-gray-700">
          {pluralizedStat(result.forks, "fork", "forks")} ·{" "}
          {pluralizedStat(result.openIssues, "open issue", "open issues")} ·{" "}
          {result.language ?? "No primary language"}
        </p>
        <button
          type="button"
          data-on:click={post("/compare/add", {
            payload: { repo: result.fullName, compareRepos: lookupForm.refs.compareRepos },
          })}
          class="w-fit rounded bg-black px-3 py-1 font-medium text-white hover:bg-gray-800"
        >
          Add to compare
        </button>
      </article>
    )}
  </section>
)

const CompareBoard = ({ repos = [] }: { repos?: readonly Repo[] }) => (
  <section id="compare-board" aria-label="Compare board" class="rounded border border-gray-200 p-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl font-semibold">Compare board</h2>
      <small
        id="compare-error"
        style="display: none"
        class="text-red-600"
        data-show={lookupForm.refs.errors.compare}
        data-text={lookupForm.refs.errors.compare}
      ></small>
    </div>
    {repos.length === 0 ? (
      <p id="compare-empty" class="mt-2 text-gray-600">
        No repositories on the compare board yet.
      </p>
    ) : (
      <div class="mt-4 overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200">
              <th scope="col" class="py-2 pr-4 font-semibold">
                Repository
              </th>
              <th scope="col" class="px-4 py-2 font-semibold">
                Stars
              </th>
              <th scope="col" class="px-4 py-2 font-semibold">
                Forks
              </th>
              <th scope="col" class="px-4 py-2 font-semibold">
                Open issues
              </th>
              <th scope="col" class="px-4 py-2 font-semibold">
                Language
              </th>
              <th scope="col" class="py-2 pl-4">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <tr class="border-b border-gray-100 last:border-b-0">
                <th scope="row" class="py-2 pr-4 font-medium">
                  {repo.fullName}
                </th>
                <td class="px-4 py-2 tabular-nums">{formatCount(repo.stars)}</td>
                <td class="px-4 py-2 tabular-nums">{formatCount(repo.forks)}</td>
                <td class="px-4 py-2 tabular-nums">{formatCount(repo.openIssues)}</td>
                <td class="px-4 py-2">{repo.language ?? "—"}</td>
                <td class="py-2 pl-4 text-right">
                  <button
                    type="button"
                    aria-label={`Remove ${repo.fullName}`}
                    data-on:click={post("/compare/remove", {
                      payload: { repo: repo.fullName, compareRepos: lookupForm.refs.compareRepos },
                    })}
                    class="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)

const uniqueRepoNames = (names: readonly string[]): readonly string[] => {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const name of names) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    unique.push(name)
  }

  return unique
}

const repoParts = (
  fullName: string,
): { readonly owner: string; readonly repo: string } | undefined => {
  const [owner = "", repo = "", extra] = fullName.split("/")

  if (owner.length === 0 || repo.length === 0 || extra !== undefined) {
    return undefined
  }

  return { owner, repo }
}

const fetchRepoByName = (fullName: string) => {
  const parts = repoParts(fullName)
  if (parts === undefined) {
    return Effect.fail(new GitHubUnavailableError({ reason: "invalid_name" }))
  }

  return fetchRepoStats(parts.owner, parts.repo)
}

const fetchCompareRepos = (repoNames: readonly string[]) =>
  Effect.all(repoNames.map(fetchRepoByName), { concurrency: "unbounded" })

const home: Hono<AppEnv> = new Hono<AppEnv>()

home.get("/", (c) => {
  c.get("log").set({ page: { name: "home" } })

  return reply.page(
    <main
      id="app"
      data-signals={mod(lookupForm.defaults, { ifMissing: true })}
      class="mx-auto flex max-w-4xl flex-col gap-4 p-8 font-sans"
    >
      <h1 class="text-3xl font-bold">{SITE_TITLE}</h1>
      <form
        id="lookup-form"
        data-on:submit={mod(post("/lookup"), { prevent: true })}
        class="flex flex-wrap items-center gap-2"
      >
        <label class="flex items-center gap-2">
          Repository
          <input
            name="repo"
            autocomplete="off"
            data-bind={lookupForm.refs.repo}
            class="w-56 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <button
          type="submit"
          class="rounded bg-black px-3 py-1 font-medium text-white hover:bg-gray-800"
        >
          Look up repo
        </button>
        <small
          id="repo-error"
          style="display: none"
          class="w-full text-red-600"
          data-show={lookupForm.refs.errors.repo}
          data-text={lookupForm.refs.errors.repo}
        ></small>
      </form>
      <LookupResult />
      <CompareBoard />
    </main>,
    {
      title: SITE_TITLE,
      head: pageHead(),
    },
  )
})

home.post("/lookup", (c) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const log = c.get("log")
      const signals = yield* Effect.promise(() => read.signals(c.req.raw))
      const parsed = yield* Effect.result(Schema.decodeUnknownEffect(RepoSignals)(signals))

      const invalid = (): Response => {
        log.set({ lookup: { ok: false, reason: "invalid_repo" } })
        return reply.stream([
          event.signals(lookupForm.patch({ errors: { repo: invalidRepoMessage } })),
          event.patch(<LookupResult />),
        ])
      }

      if (Result.isFailure(parsed)) return invalid()

      const parts = repoParts(parsed.success.repo)
      if (parts === undefined) return invalid()

      const found = yield* Effect.result(fetchRepoStats(parts.owner, parts.repo))
      if (Result.isFailure(found)) {
        const error = found.failure
        const message =
          error._tag === "RepoNotFoundError"
            ? `Repository ${error.owner}/${error.repo} not found`
            : "Could not reach GitHub. Try again."
        log.set({ lookup: { ok: false, reason: "fetch_failed" } })
        return reply.stream([
          event.signals(lookupForm.patch({ errors: { repo: message } })),
          event.patch(<LookupResult />),
        ])
      }

      log.set({ lookup: { ok: true, repo: found.success.fullName, stars: found.success.stars } })
      return reply.stream([
        event.signals(lookupForm.patch({ errors: { repo: "" } })),
        event.patch(<LookupResult result={found.success} />),
      ])
    }),
  ),
)

home.post("/compare/add", (c) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const log = c.get("log")
      const signals = yield* Effect.promise(() => read.signals(c.req.raw))
      const parsed = yield* Effect.result(Schema.decodeUnknownEffect(CompareBoardSignals)(signals))

      if (Result.isFailure(parsed)) {
        log.set({ compare: { ok: false, reason: "invalid_repo" } })
        return reply.signals(
          lookupForm.patch({ errors: { compare: "Choose a valid repository to compare." } }),
        )
      }

      const repoNames = uniqueRepoNames([
        ...(parsed.success.compareRepos ?? []),
        parsed.success.repo,
      ])
      if (repoNames.length > maxCompareRepos) {
        log.set({ compare: { ok: false, reason: "too_many_repos" } })
        return reply.signals(
          lookupForm.patch({
            errors: { compare: `Compare up to ${maxCompareRepos} repositories.` },
          }),
        )
      }

      const result = yield* Effect.result(fetchCompareRepos(repoNames))
      if (Result.isFailure(result)) {
        log.set({ compare: { ok: false, reason: "fetch_failed" } })
        return reply.signals(
          lookupForm.patch({
            errors: { compare: "Could not refresh the compare board. Try again." },
          }),
        )
      }

      const repos = result.success
      const compareRepos = repos.map((repo) => repo.fullName)
      log.set({ compare: { ok: true, repos: compareRepos.length } })
      return reply.stream([
        event.signals(lookupForm.patch({ compareRepos, errors: { compare: "" } })),
        event.patch(<CompareBoard repos={repos} />),
      ])
    }),
  ),
)

home.post("/compare/remove", (c) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const log = c.get("log")
      const signals = yield* Effect.promise(() => read.signals(c.req.raw))
      const parsed = yield* Effect.result(Schema.decodeUnknownEffect(CompareBoardSignals)(signals))

      if (Result.isFailure(parsed)) {
        log.set({ compare: { ok: false, reason: "invalid_repo" } })
        return reply.signals(
          lookupForm.patch({ errors: { compare: "Choose a valid repository to remove." } }),
        )
      }

      const removedKey = parsed.success.repo.toLowerCase()
      const repoNames = uniqueRepoNames(parsed.success.compareRepos ?? []).filter(
        (repoName) => repoName.toLowerCase() !== removedKey,
      )

      const result = yield* Effect.result(fetchCompareRepos(repoNames))
      if (Result.isFailure(result)) {
        log.set({ compare: { ok: false, reason: "fetch_failed" } })
        return reply.signals(
          lookupForm.patch({
            errors: { compare: "Could not refresh the compare board. Try again." },
          }),
        )
      }

      const repos = result.success
      const compareRepos = repos.map((repo) => repo.fullName)
      log.set({ compare: { ok: true, repos: compareRepos.length } })
      return reply.stream([
        event.signals(lookupForm.patch({ compareRepos, errors: { compare: "" } })),
        event.patch(<CompareBoard repos={repos} />),
      ])
    }),
  ),
)

export default home
