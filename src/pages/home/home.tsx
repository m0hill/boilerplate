import { Hono } from "hono"
import { z } from "zod"
import { event, mod, post, read, reply, state } from "datastar-kit"
import type { AppEnv } from "../../app-env.js"
import { SITE_TITLE } from "../../constants.js"
import { pageHead, clientScript } from "../../ui/head.js"
import { fetchRepoStars, RepoNotFoundError, type Repo } from "./github.js"

const lookupForm = state({
  repo: "mswjs/cloudflare",
  errors: {
    repo: "",
  },
})

const RepoSignals = z.object({
  repo: z
    .string()
    .trim()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Use the owner/repo format, e.g. mswjs/cloudflare"),
})

const Stars = ({ result }: { result?: Repo }) => (
  <output id="stars" class="text-xl">
    {result ? `${result.fullName} · ${result.stars.toLocaleString()} ★` : "—"}
  </output>
)

const home: Hono<AppEnv> = new Hono<AppEnv>()

home.get("/", (c) => {
  c.get("log").set({ page: { name: "home" } })

  return reply.page(
    <main
      id="app"
      data-signals={mod(lookupForm.defaults, { ifMissing: true })}
      class="mx-auto flex max-w-md flex-col gap-4 p-8 font-sans"
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
          Look up stars
        </button>
        <small
          id="repo-error"
          style="display: none"
          class="w-full text-red-600"
          data-show={lookupForm.refs.errors.repo}
          data-text={lookupForm.refs.errors.repo}
        ></small>
      </form>
      <p class="text-xl">
        Stars: <Stars />
      </p>
      <p class="text-sm text-gray-500">
        Client island clock: <span id="clock">—</span>
      </p>
    </main>,
    {
      title: SITE_TITLE,
      head: [...pageHead(), clientScript("clock")],
    },
  )
})

home.post("/lookup", async (c) => {
  const log = c.get("log")
  const result = RepoSignals.safeParse(await read.signals(c.req.raw))

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    const message = fieldErrors.repo?.[0] ?? "Invalid repository."
    log.set({ lookup: { ok: false, reason: "invalid_repo" } })
    return reply.stream([
      event.signals(lookupForm.patch({ errors: { repo: message } })),
      event.patch(<Stars />),
    ])
  }

  const [owner, repo] = result.data.repo.split("/")
  if (owner === undefined || repo === undefined) {
    log.set({ lookup: { ok: false, reason: "invalid_repo" } })
    return reply.stream([
      event.signals(lookupForm.patch({ errors: { repo: "Use the owner/repo format." } })),
      event.patch(<Stars />),
    ])
  }

  try {
    const found = await fetchRepoStars(owner, repo)
    log.set({ lookup: { ok: true, repo: found.fullName, stars: found.stars } })
    return reply.stream([
      event.signals(lookupForm.patch({ errors: { repo: "" } })),
      event.patch(<Stars result={found} />),
    ])
  } catch (error) {
    const message =
      error instanceof RepoNotFoundError ? error.message : "Could not reach GitHub. Try again."
    log.set({ lookup: { ok: false, reason: "fetch_failed" } })
    return reply.stream([
      event.signals(lookupForm.patch({ errors: { repo: message } })),
      event.patch(<Stars />),
    ])
  }
})

export default home
