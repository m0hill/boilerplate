import { DemoLayout } from "../../../ui/demo.js"
import type { StoredObject } from "../../../services/r2-objects/r2-objects.js"
import { ObjectForm, type R2FormState } from "./form.js"
import { ObjectList } from "./object-list.js"

const sources = [
  {
    path: "src/services/r2-objects/r2-objects.ts",
    role: "R2Objects: put / list / get / delete on the bucket",
  },
  { path: "src/services/r2-objects/object.ts", role: "key + content validation as tagged errors" },
  { path: "src/pages/r2-demo/index.tsx", role: "routes, error handling, SSE list patches" },
] as const

export const R2Page = ({
  form,
  objects,
}: {
  readonly form: R2FormState
  readonly objects: readonly StoredObject[]
}) => (
  <DemoLayout
    title="R2 object store"
    tagline="Save text objects to a Cloudflare R2 bucket, then list, open, and delete them. Each
      operation is an Effect with typed failures; the listing refreshes over a Datastar element
      patch without a full reload."
    sources={sources}
  >
    <ObjectForm form={form} />
    <ObjectList objects={objects} />
  </DemoLayout>
)
