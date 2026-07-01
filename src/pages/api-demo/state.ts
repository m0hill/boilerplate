import { state } from "datastar-kit"
import { Schema } from "effect"

export const lookupForm = state({
  repo: "honojs/hono",
  errors: { repo: "" },
})

export type LookupFormState = typeof lookupForm

const RepoInput = Schema.Trim.check(Schema.isMinLength(1))

export const LookupRepoSignals = Schema.Struct({ repo: RepoInput })
