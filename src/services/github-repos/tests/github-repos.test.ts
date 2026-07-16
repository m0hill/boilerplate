import { Effect, Fiber } from "effect"
import { describe, expect, it } from "vitest"
import { makeGitHubRepos } from "@/services/github-repos/github-repos"
import { parseRepoName } from "@/services/github-repos/repo-name"

describe("GitHub repositories", () => {
  it("aborts an in-flight request when the lookup is interrupted", async () => {
    let requestSignal: AbortSignal | undefined
    const fetch: typeof globalThis.fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        if (signal === undefined || signal === null) return

        requestSignal = signal
        signal.addEventListener("abort", () => reject(signal.reason), { once: true })
      })
    const github = makeGitHubRepos(fetch)

    await Effect.runPromise(
      Effect.gen(function* () {
        const repoName = yield* parseRepoName("honojs/hono")
        const fiber = yield* github
          .fetch(repoName)
          .pipe(Effect.forkChild({ startImmediately: true }))

        expect(requestSignal?.aborted).toBe(false)
        yield* Fiber.interrupt(fiber)
        expect(requestSignal?.aborted).toBe(true)
      }),
    )
  })

  it("keeps the request signal active while reading the response body", async () => {
    let requestSignal: AbortSignal | undefined
    let markBodyReadStarted = () => {}
    const bodyReadStarted = new Promise<void>((resolve) => {
      markBodyReadStarted = resolve
    })
    const fetch: typeof globalThis.fetch = (_input, init) => {
      const signal = init?.signal
      if (signal === undefined || signal === null) {
        return Promise.reject(new Error("expected a request signal"))
      }

      requestSignal = signal
      const body = new ReadableStream({
        pull: () => {
          markBodyReadStarted()
          return new Promise<void>((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true })
          })
        },
      })
      return Promise.resolve(
        new Response(body, { headers: { "content-type": "application/json" } }),
      )
    }
    const github = makeGitHubRepos(fetch)

    await Effect.runPromise(
      Effect.gen(function* () {
        const repoName = yield* parseRepoName("honojs/hono")
        const fiber = yield* github
          .fetch(repoName)
          .pipe(Effect.forkChild({ startImmediately: true }))

        yield* Effect.promise(() => bodyReadStarted)
        expect(requestSignal?.aborted).toBe(false)
        yield* Fiber.interrupt(fiber)
        expect(requestSignal?.aborted).toBe(true)
      }),
    )
  })
})
