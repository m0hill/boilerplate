import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { loadApp, request } from "@/test/utils"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

const makePublicDirectory = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "boilerplate-assets-"))
  directories.push(directory)
  await mkdir(path.join(directory, "js"))
  await writeFile(path.join(directory, "app.css"), "body { color: black; }")
  await writeFile(path.join(directory, "js", "app.js"), "console.log('ready')")
  return directory
}

describe("static assets", () => {
  it("serves built assets before application routes", async () => {
    const app = await loadApp({ publicDirectory: await makePublicDirectory() })

    const css = await app.fetch(request("/app.css"))
    const javascript = await app.fetch(request("/js/app.js"))

    expect(css.status).toBe(200)
    await expect(css.text()).resolves.toBe("body { color: black; }")
    expect(javascript.status).toBe(200)
    await expect(javascript.text()).resolves.toBe("console.log('ready')")
  })

  it("returns an asset 404 for a missing asset", async () => {
    const app = await loadApp({ publicDirectory: await makePublicDirectory() })
    const response = await app.fetch(request("/js/missing.js"))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe("Asset Not Found")
  })
})
