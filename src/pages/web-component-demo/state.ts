import { state } from "datastar-kit"

export const qrForm = state({ text: "https://github.com/m0hill/boilerplate" })

export type QrFormState = typeof qrForm
