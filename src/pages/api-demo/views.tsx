import { mod, post, state } from "datastar-kit"
import { DemoLayout } from "../../ui/demo.js"
import type { Repo } from "./github.js"

const sources = [
  {
    path: "src/pages/api-demo/github.ts",
    role: "GitHubRepos: HttpClient call + Schema-parsed body",
  },
  { path: "src/pages/api-demo/api-demo.tsx", role: "routes, tagged-error handling, SSE patches" },
  { path: "src/pages/api-demo/api-demo.test.ts", role: "the outbound call mocked with MSW" },
] as const

export const lookupForm = state({
  repo: "honojs/hono",
  errors: { repo: "" },
})

const formatCount = (value: number): string => value.toLocaleString()

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div class="flex flex-col">
    <dt class="text-sm text-gray-500">{label}</dt>
    <dd class="text-xl font-semibold tabular-nums">{value}</dd>
  </div>
)

export const RepoResult = ({ result }: { result?: Repo }) => (
  <section id="repo-result" class="rounded border border-gray-200 p-4">
    {result === undefined ? (
      <p class="text-gray-500">Look up a repository to see its public stats.</p>
    ) : (
      <article class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">{result.fullName}</h2>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <Stat label="Stars" value={formatCount(result.stars)} />
          <Stat label="Forks" value={formatCount(result.forks)} />
          <Stat label="Open issues" value={formatCount(result.openIssues)} />
          <Stat label="Language" value={result.language ?? "—"} />
        </dl>
      </article>
    )}
  </section>
)

export const ApiDemoMain = () => (
  <DemoLayout
    title="External API"
    tagline="Fetch a public GitHub repository with Effect's HttpClient, parse the JSON with Schema,
      and model every failure (bad input, 404, unexpected body) as a typed error. The outbound call
      is mocked with MSW in the test."
    sources={sources}
  >
    <form
      id="lookup-form"
      data-signals={mod(lookupForm.defaults, { ifMissing: true })}
      data-on:submit={mod(post("/api/lookup"), { prevent: true })}
      class="flex flex-wrap items-end gap-3"
    >
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Repository</span>
        <input
          name="repo"
          autocomplete="off"
          placeholder="owner/repo"
          data-bind={lookupForm.refs.repo}
          class="w-64 rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        class="rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
      >
        Look up
      </button>
      <small
        id="repo-error"
        style="display: none"
        class="w-full text-red-600"
        data-show={lookupForm.refs.errors.repo}
        data-text={lookupForm.refs.errors.repo}
      ></small>
    </form>
    <RepoResult />
  </DemoLayout>
)
