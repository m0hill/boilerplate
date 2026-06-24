import { mod, post, state } from "datastar-kit"
import { SITE_TITLE } from "../../constants.js"
import type { Repo } from "./github.js"

const defaultCompareRepos: readonly string[] = []

export const lookupForm = state({
  repo: "mswjs/cloudflare",
  compareRepos: defaultCompareRepos,
  errors: {
    repo: "",
    compare: "",
  },
})

const formatCount = (value: number): string => value.toLocaleString()

const pluralizedStat = (value: number, singular: string, plural: string): string =>
  `${formatCount(value)} ${value === 1 ? singular : plural}`

const Stars = ({ result }: { result?: Repo }) => (
  <output id="stars" class="text-xl">
    {result ? `${result.fullName} · ${formatCount(result.stars)} ★` : "—"}
  </output>
)

export const LookupResult = ({ result }: { result?: Repo }) => (
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

export const CompareBoard = ({ repos = [] }: { repos?: readonly Repo[] }) => (
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

export const HomeMain = () => (
  <main
    id="app"
    data-signals={mod(lookupForm.defaults, { ifMissing: true })}
    class="mx-auto flex max-w-4xl flex-col gap-4 p-8 font-sans"
  >
    <h1 class="text-3xl font-bold">{SITE_TITLE}</h1>
    <a href="/counter" class="w-fit text-sm text-gray-600 underline">
      KV counter demo →
    </a>
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
  </main>
)
