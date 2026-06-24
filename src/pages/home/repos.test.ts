import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  addCompareRepo,
  CompareBoardFullError,
  InvalidRepoNameError,
  maxCompareRepos,
  parseRepoName,
  removeCompareRepo,
  RepoName,
} from "./repos.js"

const parseRepoNames = (inputs: readonly string[]) =>
  Effect.runPromise(Effect.all(inputs.map(parseRepoName)))

describe("RepoName", () => {
  it("parses and normalizes owner/repo input", async () => {
    const repoName = await Effect.runPromise(parseRepoName(" mswjs/cloudflare "))

    expect(repoName).toBeInstanceOf(RepoName)
    expect(repoName).toMatchObject({
      owner: "mswjs",
      repo: "cloudflare",
      fullName: "mswjs/cloudflare",
    })
  })

  it("rejects malformed repository names", async () => {
    const error = await Effect.runPromise(parseRepoName("not-a-repo").pipe(Effect.flip))

    expect(error).toBeInstanceOf(InvalidRepoNameError)
    expect(error.input).toBe("not-a-repo")
  })
})

describe("compare board", () => {
  it("adds a repository while deduplicating the current board", async () => {
    const current = await parseRepoNames(["mswjs/cloudflare", "MSWJS/cloudflare"])
    const repo = await Effect.runPromise(parseRepoName("honojs/hono"))

    const next = await Effect.runPromise(addCompareRepo(current, repo))

    expect(next.map((repoName) => repoName.fullName)).toEqual(["mswjs/cloudflare", "honojs/hono"])
  })

  it("rejects a repository when the board is full", async () => {
    const current = await parseRepoNames(["one/a", "two/b", "three/c", "four/d"])
    const repo = await Effect.runPromise(parseRepoName("five/e"))

    const error = await Effect.runPromise(addCompareRepo(current, repo).pipe(Effect.flip))

    expect(error).toBeInstanceOf(CompareBoardFullError)
    expect(error.max).toBe(maxCompareRepos)
  })

  it("removes a repository case-insensitively", async () => {
    const current = await parseRepoNames(["mswjs/cloudflare", "MSWJS/cloudflare", "honojs/hono"])
    const repo = await Effect.runPromise(parseRepoName("MSWJS/cloudflare"))

    expect(removeCompareRepo(current, repo).map((repoName) => repoName.fullName)).toEqual([
      "honojs/hono",
    ])
  })
})
