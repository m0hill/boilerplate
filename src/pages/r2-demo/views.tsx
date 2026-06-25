import { mod, post, state } from "datastar-kit"
import { DemoLayout } from "../../ui/demo.js"
import type { StoredObject } from "./store.js"

const sources = [
  {
    path: "src/pages/r2-demo/store.ts",
    role: "R2ObjectStore: put / list / get / delete on the bucket",
  },
  { path: "src/pages/r2-demo/objects.ts", role: "key + content validation as tagged errors" },
  { path: "src/pages/r2-demo/r2-demo.tsx", role: "routes, error handling, SSE list patches" },
] as const

export const r2Form = state({
  key: "notes/hello.txt",
  content: "Stored as an object in R2.",
  errors: { form: "" },
})

const formatBytes = (size: number): string => {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(1)} KB`
}

const formatDate = (iso: string): string => iso.replace("T", " ").replace(/\..*$/, " UTC")

export const ObjectList = ({ objects = [] }: { objects?: readonly StoredObject[] }) => (
  <section id="r2-objects" aria-label="Stored objects" class="flex flex-col gap-3">
    <h2 class="text-lg font-semibold">Objects in the bucket</h2>
    {objects.length === 0 ? (
      <p class="text-gray-500">The bucket is empty. Save an object above.</p>
    ) : (
      <ul class="flex flex-col divide-y divide-gray-100 rounded border border-gray-200">
        {objects.map((object) => (
          <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div class="flex min-w-0 flex-col">
              <a
                href={`/r2/object?key=${encodeURIComponent(object.key)}`}
                target="_blank"
                rel="noreferrer"
                class="truncate font-mono text-sm underline"
              >
                {object.key}
              </a>
              <span class="text-xs text-gray-500">
                {formatBytes(object.size)} · {formatDate(object.uploaded)}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Delete ${object.key}`}
              data-on:click={post("/r2/delete", { payload: { key: object.key } })}
              class="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
)

export const R2DemoMain = ({ objects }: { objects: readonly StoredObject[] }) => (
  <DemoLayout
    title="R2 object store"
    tagline="Save text objects to a Cloudflare R2 bucket, then list, open, and delete them. Each
      operation is an Effect with typed failures; the listing refreshes over a Datastar element
      patch without a full reload."
    sources={sources}
  >
    <form
      id="r2-form"
      data-signals={mod(r2Form.defaults, { ifMissing: true })}
      data-on:submit={mod(post("/r2/put"), { prevent: true })}
      class="flex flex-col gap-3"
    >
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Key</span>
        <input
          name="key"
          autocomplete="off"
          placeholder="notes/hello.txt"
          data-bind={r2Form.refs.key}
          class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Content</span>
        <textarea
          name="content"
          rows="3"
          data-bind={r2Form.refs.content}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        ></textarea>
      </label>
      <div class="flex items-center gap-3">
        <button
          type="submit"
          class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
        >
          Save object
        </button>
        <small
          id="r2-error"
          style="display: none"
          class="text-red-600"
          data-show={r2Form.refs.errors.form}
          data-text={r2Form.refs.errors.form}
        ></small>
      </div>
    </form>
    <ObjectList objects={objects} />
  </DemoLayout>
)
