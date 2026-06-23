import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { InvalidRepoNameError, parseRepoName, RepoName, uniqueRepoNames } from "./repo-name.js"

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

  it("deduplicates names case-insensitively while preserving the first spelling", async () => {
    const names = await Effect.runPromise(
      Effect.all([
        parseRepoName("mswjs/cloudflare"),
        parseRepoName("MSWJS/cloudflare"),
        parseRepoName("honojs/hono"),
      ]),
    )

    expect(uniqueRepoNames(names).map((repoName) => repoName.fullName)).toEqual([
      "mswjs/cloudflare",
      "honojs/hono",
    ])
  })
})
