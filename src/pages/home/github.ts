import { z } from "zod"

export type Repo = {
  readonly fullName: string
  readonly stars: number
  readonly forks: number
  readonly openIssues: number
  readonly language: string | null
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
  forks_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  language: z.string().min(1).nullable(),
})

const USER_AGENT = "boilerplate-worker"

export const fetchRepoStats = async (owner: string, repo: string): Promise<Repo> => {
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

  return {
    fullName: result.data.full_name,
    stars: result.data.stargazers_count,
    forks: result.data.forks_count,
    openIssues: result.data.open_issues_count,
    language: result.data.language,
  }
}
