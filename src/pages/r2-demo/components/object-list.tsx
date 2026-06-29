import { post } from "datastar-kit"
import type { StoredObject } from "../../../resources/r2-objects/r2-objects.js"

const formatBytes = (size: number): string => {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(1)} KB`
}

const formatDate = (iso: string): string => iso.replace("T", " ").replace(/\..*$/, " UTC")

export const ObjectList = ({ objects = [] }: { readonly objects?: readonly StoredObject[] }) => (
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
