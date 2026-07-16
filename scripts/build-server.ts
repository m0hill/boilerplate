import * as esbuild from "esbuild"

const watch = process.argv.includes("--watch")

const options: esbuild.BuildOptions = {
  entryPoints: ["src/index.tsx"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node24",
  packages: "external",
  sourcemap: true,
  outfile: "dist/server.js",
  alias: { "@": "./src" },
  logLevel: "info",
}

if (watch) {
  const ctx = await esbuild.context(options)
  await ctx.watch()
  console.log("esbuild watching src → dist/server.js")
} else {
  await esbuild.build(options)
}
