import { DemoLayout } from "../../ui/demo.js"

const sources = [
  { path: "src/client/qr.ts", role: "the browser island: reads the input, encodes, paints canvas" },
  { path: "src/pages/island-demo/views.tsx", role: "server-rendered shell the island hydrates" },
  { path: "scripts/build-client.ts", role: "esbuild bundles src/client/*.ts → public/js/*.js" },
] as const

export const IslandDemoMain = () => (
  <DemoLayout
    title="Client island"
    tagline="Some behavior has no server round trip — a live QR generator that encodes text and paints
      a canvas in the browser. Datastar owns server state; islands own self-contained client logic,
      bundled from src/client by esbuild."
    sources={sources}
  >
    <label class="flex flex-col gap-2">
      <span class="text-sm font-medium">Text to encode</span>
      <input
        id="qr-input"
        type="text"
        value="https://github.com/m0hill/boilerplate"
        autocomplete="off"
        class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
      />
    </label>
    <canvas
      id="qr-canvas"
      width="240"
      height="240"
      class="h-60 w-60 rounded border border-gray-200"
    >
      Your browser does not support canvas.
    </canvas>
    <p class="text-sm text-gray-500">
      No network requests — type and the code redraws instantly, client-side.
    </p>
  </DemoLayout>
)
