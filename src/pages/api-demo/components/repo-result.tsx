import { Option } from "effect"
import type { Repo } from "@/services/github-repos/github-repos"

const formatCount = (value: number): string => value.toLocaleString()
const formatLanguage = (language: Repo["language"]): string => Option.getOrElse(language, () => "—")

const Stat = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div class="flex flex-col">
    <dt class="text-sm text-gray-500">{label}</dt>
    <dd class="text-xl font-semibold tabular-nums">{value}</dd>
  </div>
)

export const RepoResult = ({ result }: { readonly result: Option.Option<Repo> }) => (
  <section
    id="repo-result"
    class="rounded border border-gray-200 p-4"
  >
    {Option.match(result, {
      onNone: () => <p class="text-gray-500">Look up a repository to see its public stats.</p>,
      onSome: (repo) => (
        <article class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold">{repo.fullName}</h2>
          <dl class="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            <Stat
              label="Stars"
              value={formatCount(repo.stars)}
            />
            <Stat
              label="Forks"
              value={formatCount(repo.forks)}
            />
            <Stat
              label="Open issues"
              value={formatCount(repo.openIssues)}
            />
            <Stat
              label="Language"
              value={formatLanguage(repo.language)}
            />
          </dl>
        </article>
      ),
    })}
  </section>
)
