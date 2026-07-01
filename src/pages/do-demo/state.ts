import { state } from "datastar-kit"

export const chatForm = state({
  room: "",
  author: "",
  body: "",
  errors: { form: "" },
})

export type ChatFormState = typeof chatForm
