import { readdir } from "node:fs/promises"
import * as esbuild from "esbuild"

const SRC_DIR = "src/client"
const OUT_DIR = "public/js"

const watch = process.argv.includes("--watch")

const entryPoints = (await readdir(SRC_DIR))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => `${SRC_DIR}/${file}`)

const options: esbuild.BuildOptions = {
  entryPoints,
  bundle: true,
  format: "esm",
  target: "es2022",
  outdir: OUT_DIR,
  minify: !watch,
  logLevel: "info",
}

if (watch) {
  const ctx = await esbuild.context(options)
  await ctx.watch()
  console.log(`esbuild watching ${SRC_DIR} → ${OUT_DIR}`)
} else {
  await esbuild.build(options)
}
