import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"))
test("safe UI contract exposes only audited block kinds", async () => {
  const schema = await readJson("schemas/ui-blocks.schema.json")
  const kinds = schema.$defs.block.oneOf.map((item) => item.$ref.split("/").at(-1)).sort()
  assert.deepEqual(kinds, [
    "bar-chart",
    "calendar",
    "line-chart",
    "list",
    "metric-group",
    "notice",
    "progress",
    "table",
    "text",
    "timeline",
  ])
})
test("bundle contract contains snapshots rather than LLM-controlled paths", async () => {
  const schema = await readJson("schemas/snapshot-bundle.schema.json")
  assert.ok(schema.properties.snapshots)
  assert.equal(schema.properties.path, undefined)
  assert.equal(schema.properties.snapshots.maxItems, 20)
})
test("default daily workflow batches several sources into one publication", async () => {
  const registry = await readJson("config/workflows.json")
  const daily = registry.workflows.find((workflow) => workflow.id === "daily-core")
  assert.equal(daily.publication, "pull-request")
  assert.equal(daily.max_attempts, 3)
  assert.ok(daily.source_ids.length >= 3)
  assert.ok(daily.source_ids.includes("overview:daily"))
})
test("every source has one deterministic worker-owned path", async () => {
  const registry = await readJson("config/sources.json")
  assert.equal(new Set(registry.sources.map((item) => item.id)).size, registry.sources.length)
  assert.equal(new Set(registry.sources.map((item) => item.worker_id)).size, registry.sources.length)
  registry.sources.forEach((item) =>
    assert.equal(item.target_path, `data/snapshots/${item.domain}/${item.source}/{YYYY}/{MM}/{YYYY-MM-DD}.json`),
  )
})
test("public examples are unmistakably synthetic", async () => {
  const registry = await readJson("config/sources.json")
  for (const source of registry.sources) {
    const snapshot = await readJson(`data/examples/${source.domain}/${source.source}/2026-08-24.json`)
    assert.equal(snapshot.privacy.synthetic, true)
    assert.equal(snapshot.privacy.contains_personal_data, false)
    assert.equal(snapshot.privacy.classification, "public")
  }
})
