import assert from "node:assert/strict"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

test("showcase build excludes private data and local identity even when both exist", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "zaati-showcase-"))
  try {
    for (const directory of ["config", "examples/snapshots", "data/examples", "data/component-examples.json", "schemas", "prompts", "docs"])
      await cp(directory, path.join(fixture, directory), { recursive: true })
    const config = JSON.parse(await readFile("config/instance.example.json", "utf8"))
    config.brand_name = "PRIVATE_IDENTITY_SENTINEL"
    await writeFile(path.join(fixture, "config/instance.local.json"), JSON.stringify(config))
    await mkdir(path.join(fixture, "private-input"))
    await writeFile(path.join(fixture, "private-input/secret.json"), "PRIVATE_SNAPSHOT_SENTINEL")
    const result = spawnSync(process.execPath, [path.resolve("scripts/build-data-index.mjs")], {
      cwd: fixture,
      env: { ...process.env, ZAATI_EXAMPLES: "true", ZAATI_DATA_DIR: "private-input" },
      encoding: "utf8",
    })
    assert.equal(result.status, 0, result.stderr)
    const output = await readFile(path.join(fixture, "public/data/dashboard-data.json"), "utf8")
    assert.doesNotMatch(output, /PRIVATE_IDENTITY_SENTINEL|PRIVATE_SNAPSHOT_SENTINEL/)
    const dashboard = JSON.parse(output)
    assert.equal(dashboard.demoMode, true)
    assert.equal(dashboard.syntheticData, true)
    assert.deepEqual(dashboard.sources.map((s) => s.definition.id).sort(), [
      "agenda:primary",
      "inbox:attention",
      "money:pulse",
      "news:briefing",
      "overview:daily",
      "review:weekly",
      "work:focus",
    ])
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
})

test("default and showcase pages stay identical", async () => {
  const registry = JSON.parse(await readFile("config/sources.json", "utf8"))
  for (const source of registry.sources) {
    const relative = `${source.domain}/${source.source}/2026-08-24.json`
    assert.deepEqual(
      JSON.parse(await readFile(`data/examples/${relative}`, "utf8")),
      JSON.parse(await readFile(`examples/snapshots/${relative}`, "utf8")),
    )
  }
})
