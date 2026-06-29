import { Layout } from "@/ui/layout"
import type { StoredObject } from "@/resources/r2-objects/r2-objects"
import { ObjectForm, type R2FormState } from "@/pages/r2-demo/components/form"
import { ObjectList } from "@/pages/r2-demo/components/object-list"

const sources = [
  {
    path: "src/resources/r2-objects/r2-objects.ts",
    role: "R2Objects: put / list / get / delete on the bucket",
  },
  { path: "src/resources/r2-objects/object.ts", role: "key + content validation as tagged errors" },
  { path: "src/pages/r2-demo/index.tsx", role: "routes, error handling, SSE list patches" },
] as const

export const R2Page = ({
  form,
  objects,
}: {
  readonly form: R2FormState
  readonly objects: readonly StoredObject[]
}) => (
  <Layout
    title="R2 object store"
    tagline="Save text objects to a Cloudflare R2 bucket, then list, open, and delete them. Each
      operation is an Effect with typed failures; the listing refreshes over a Datastar element
      patch without a full reload."
    sources={sources}
  >
    <ObjectForm form={form} />
    <ObjectList objects={objects} />
  </Layout>
)
