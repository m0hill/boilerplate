import { DateTime } from "effect"
import { post } from "datastar-kit"
import type { StoredObject } from "@/resources/r2-objects/r2-objects"
import { Button } from "@/ui/button"

const formatBytes = (size: number): string => {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(1)} KB`
}

const formatDate = (uploaded: DateTime.Utc): string =>
  DateTime.formatIso(uploaded).replace("T", " ").replace(/\..*$/, " UTC")

export const ObjectList = ({ objects }: { readonly objects: readonly StoredObject[] }) => (
  <section
    id="r2-objects"
    aria-label="Stored objects"
    class="flex flex-col gap-3"
  >
    <h2 class="text-lg font-semibold">Objects in the bucket</h2>
    {objects.length === 0 ? (
      <p class="text-muted">The bucket is empty. Save an object above.</p>
    ) : (
      <ul class="flex flex-col divide-y divide-border rounded-lg border border-border">
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
              <span class="text-xs text-muted">
                {formatBytes(object.size)} · {formatDate(object.uploaded)}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Delete ${object.key}`}
              data-on:click={post("/r2/delete", { payload: { key: object.key } })}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    )}
  </section>
)
