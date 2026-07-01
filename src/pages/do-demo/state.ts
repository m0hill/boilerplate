import { state } from "datastar-kit"
import { Schema } from "effect"

export const chatForm = state({
  room: "",
  author: "",
  body: "",
  errors: { form: "" },
})

export type ChatFormState = typeof chatForm

export const PostMessageSignals = Schema.Struct({
  room: Schema.String,
  author: Schema.String,
  body: Schema.String,
})
