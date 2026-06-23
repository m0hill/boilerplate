import { Hono } from "hono"
import { z } from "zod"
import { event, mod, post, read, reply, state } from "datastar-kit"
import type { AppEnv } from "../../app-env.js"
import { SITE_TITLE } from "../../constants.js"
import { pageHead, clientScript } from "../../ui/head.js"

let count = 0

const counterForm = state({
  step: "1",
  errors: {
    step: "",
  },
})

const StepSignals = z.object({
  step: z.coerce.number().int().positive("Step must be a positive whole number."),
})

const Count = () => <output id="count">{count}</output>

const home: Hono<AppEnv> = new Hono<AppEnv>()

home.get("/", (c) => {
  c.get("log").set({ page: { name: "home" } })

  return reply.page(
    <main
      id="app"
      data-signals={mod(counterForm.defaults, { ifMissing: true })}
      class="mx-auto flex max-w-md flex-col gap-4 p-8 font-sans"
    >
      <h1 class="text-3xl font-bold">{SITE_TITLE}</h1>
      <form
        id="counter-form"
        data-on:submit={mod(post("/increment"), { prevent: true })}
        class="flex flex-wrap items-center gap-2"
      >
        <label class="flex items-center gap-2">
          Step
          <input
            name="step"
            inputmode="numeric"
            autocomplete="off"
            data-bind={counterForm.refs.step}
            class="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <button
          type="submit"
          class="rounded bg-black px-3 py-1 font-medium text-white hover:bg-gray-800"
        >
          Increment
        </button>
        <small
          id="step-error"
          style="display: none"
          class="w-full text-red-600"
          data-show={counterForm.refs.errors.step}
          data-text={counterForm.refs.errors.step}
        ></small>
      </form>
      <p class="text-xl">
        Count: <Count />
      </p>
      <p class="text-sm text-gray-500">
        Client island clock: <span id="clock">—</span>
      </p>
    </main>,
    {
      title: SITE_TITLE,
      head: [...pageHead(), clientScript("clock")],
    },
  )
})

home.post("/increment", async (c) => {
  const log = c.get("log")
  const result = StepSignals.safeParse(await read.signals(c.req.raw))

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    log.set({ counter: { accepted: false, reason: "invalid_step" } })
    return reply.signals(
      counterForm.patch({ errors: { step: fieldErrors.step?.[0] ?? "Invalid step." } }),
    )
  }

  const before = count
  count += result.data.step
  log.set({ counter: { accepted: true, before, after: count, step: result.data.step } })

  return reply.stream([
    event.signals(counterForm.patch({ errors: { step: "" } })),
    event.patch(<Count />),
  ])
})

export default home
