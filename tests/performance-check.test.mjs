import assert from "node:assert/strict"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

test("performance check supports a repository base path", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "zaati-performance-"))
  await mkdir(path.join(fixture, "dist", "assets"), { recursive: true })
  await mkdir(path.join(fixture, "dist", "data"), { recursive: true })
  await writeFile(
    path.join(fixture, "dist", "index.html"),
    '<script src="/my-fork/theme-init.js"></script><script src="/my-fork/assets/app.js"></script><link href="/my-fork/assets/app.css" rel="stylesheet">',
  )
  await writeFile(path.join(fixture, "dist", "theme-init.js"), "document.documentElement.dataset.theme='default'")
  await writeFile(path.join(fixture, "dist", "assets", "app.js"), "console.log('Zaati OS')")
  await writeFile(path.join(fixture, "dist", "assets", "app.css"), "body{margin:0}")
  await writeFile(path.join(fixture, "dist", "data", "dashboard-data.json"), "{}")

  const result = spawnSync(process.execPath, [path.join(repository, "scripts", "check-performance.mjs")], {
    cwd: fixture,
    encoding: "utf8",
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Performance budgets:/)
})
