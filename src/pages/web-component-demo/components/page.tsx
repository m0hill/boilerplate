import { mod, type State } from "datastar-kit"
import { Layout } from "@/ui/layout"

export type QrFormState = State<{ readonly text: string }>

const sources = [
  {
    path: "src/client/qr.ts",
    role: "the <qr-code> custom element — encodes + paints, nothing else",
  },
  {
    path: "src/pages/web-component-demo/components/page.tsx",
    role: "Datastar owns the input; data-attr feeds the element",
  },
  { path: "scripts/build-client.ts", role: "esbuild bundles src/client/*.ts → public/js/*.js" },
] as const

export const WebComponentPage = ({ form }: { readonly form: QrFormState }) => (
  <Layout
    title="Web component"
    tagline="The project's main path for browser-only behavior. Datastar owns the input and the
      signal; it pushes the value into a custom element through an attribute (data-attr:text). The
      element does only the one thing Datastar cannot — encode the text and paint a canvas."
    sources={sources}
  >
    <div data-signals={mod(form.defaults, { ifMissing: true })} class="flex flex-col gap-6">
      <label class="flex flex-col gap-2">
        <span class="text-sm font-medium">Text to encode</span>
        <input
          type="text"
          autocomplete="off"
          data-bind={form.refs.text}
          class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <qr-code
        data-attr:text={form.refs.text}
        class="block h-60 w-60 rounded border border-gray-200"
      ></qr-code>
      <p class="text-sm text-gray-500">
        No network requests and no hand-written event wiring — Datastar's signal flows straight into
        the element's attribute, and it redraws.
      </p>
    </div>
  </Layout>
)
