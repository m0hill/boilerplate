import { Layout } from "../../../ui/layout.js"
import { LookupForm, type LookupFormState } from "./lookup-form.js"
import { RepoResult } from "./repo-result.js"

const sources = [
  {
    path: "src/services/github-repos/github-repos.ts",
    role: "GitHubRepos: HttpClient call + Schema-parsed body",
  },
  { path: "src/pages/api-demo/index.tsx", role: "routes, tagged-error handling, SSE patches" },
  { path: "src/pages/api-demo/tests/page.test.ts", role: "the outbound call mocked with MSW" },
] as const

export const ApiPage = ({ form }: { readonly form: LookupFormState }) => (
  <Layout
    title="External API"
    tagline="Fetch a public GitHub repository with Effect's HttpClient, parse the JSON with Schema,
      and model every failure (bad input, 404, unexpected body) as a typed error. The outbound call
      is mocked with MSW in the test."
    sources={sources}
  >
    <LookupForm form={form} />
    <RepoResult />
  </Layout>
)
