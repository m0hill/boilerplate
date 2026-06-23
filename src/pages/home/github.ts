import { z } from "zod"

export type Repo = {
  fullName: string
  stars: number
}

export class RepoNotFoundError extends Error {
  constructor(owner: string, repo: string) {
    super(`Repository ${owner}/${repo} not found`)
    this.name = "RepoNotFoundError"
  }
}

const RepoResponse = z.object({
  full_name: z.string().min(1),
  stargazers_count: z.number().int().nonnegative(),
})

const USER_AGENT = "boilerplate-worker"

export const fetchRepoStars = async (owner: string, repo: string): Promise<Repo> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/vnd.github+json",
    },
  })

  if (response.status === 404) {
    throw new RepoNotFoundError(owner, repo)
  }
  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`)
  }

  const data: unknown = await response.json()
  const result = RepoResponse.safeParse(data)
  if (!result.success) {
    throw new Error("GitHub API returned an unexpected response")
  }

  return { fullName: result.data.full_name, stars: result.data.stargazers_count }
}
