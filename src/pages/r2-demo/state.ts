import { state } from "datastar-kit"

export const r2Form = state({
  key: "notes/hello.txt",
  content: "Stored as an object in R2.",
  errors: { form: "" },
})

export type R2FormState = typeof r2Form
