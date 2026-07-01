import { state } from "datastar-kit"
import { Schema } from "effect"

export const r2Form = state({
  key: "notes/hello.txt",
  content: "Stored as an object in R2.",
  errors: { form: "" },
})

export type R2FormState = typeof r2Form

export const PutObjectSignals = Schema.Struct({ key: Schema.String, content: Schema.String })

export const DeleteObjectSignals = Schema.Struct({ key: Schema.String })
