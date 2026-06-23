import { Effect } from "effect"
import { fetchRepoStats, GitHubUnavailableError } from "./github.js"

/** Removes duplicate repository names, comparing case-insensitively. */
export const uniqueRepoNames = (names: readonly string[]): readonly string[] => {
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

/** Splits an `owner/repo` name into its parts, or `undefined` when malformed. */
export const repoParts = (
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

/** Fetches stats for every repository on the compare board, concurrently. */
export const fetchCompareRepos = (repoNames: readonly string[]) =>
  Effect.all(repoNames.map(fetchRepoByName), { concurrency: "unbounded" })
