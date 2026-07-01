import { state } from "datastar-kit"

export const lookupForm = state({
  repo: "honojs/hono",
  errors: { repo: "" },
})

export type LookupFormState = typeof lookupForm
