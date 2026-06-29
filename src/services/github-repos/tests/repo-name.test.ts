import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { InvalidRepoNameError, parseRepoName, RepoName } from "@/services/github-repos/repo-name"

describe("RepoName", () => {
  it("parses and normalizes owner/repo input", async () => {
    const repoName = await Effect.runPromise(parseRepoName(" honojs/hono "))

    expect(repoName).toBeInstanceOf(RepoName)
    expect(repoName).toMatchObject({
      owner: "honojs",
      repo: "hono",
      fullName: "honojs/hono",
    })
  })

  it("rejects malformed repository names", async () => {
    const error = await Effect.runPromise(parseRepoName("not-a-repo").pipe(Effect.flip))

    expect(error).toBeInstanceOf(InvalidRepoNameError)
    expect(error.input).toBe("not-a-repo")
  })
})
