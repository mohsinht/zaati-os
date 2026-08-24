import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { validateSnapshotPolicy } from "../scripts/lib/snapshot-policy.mjs"
import { validateCustomTheme } from "../scripts/lib/theme-contrast.mjs"

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

test("line charts require exact unique series coverage", async () => {
  const registry = await readJson("config/sources.json")
  const registration = registry.sources.find((source) => source.id === "money:pulse")
  const snapshot = await readJson("data/examples/money/pulse/2026-08-24.json")
  const chart = snapshot.data.presentation.blocks.find((block) => block.kind === "line-chart")
  chart.series.push({ ...chart.series[0] })
  chart.points[0].values = { unexpected: 1 }
  chart.points[1].x = chart.points[0].x
  const errors = validateSnapshotPolicy(snapshot, registration, { allowSynthetic: true, expectedDate: "2026-08-24" })
  assert.ok(errors.some((error) => error.includes("series keys must be unique")))
  assert.ok(errors.some((error) => error.includes("x labels must be unique")))
  assert.ok(errors.some((error) => error.includes("keys must exactly match")))
})

test("custom themes reject low-contrast semantic pairs in both modes", () => {
  const unsafe = {
    theme: {
      preset: "custom",
      custom_tokens: {
        light: {
          foreground: "#777777",
          background: "#777777",
          card_foreground: "#777777",
          card: "#777777",
          primary_foreground: "#777777",
          primary: "#777777",
          accent_foreground: "#777777",
          accent: "#777777",
          sidebar_foreground: "#777777",
          sidebar: "#777777",
          border: "#777777",
          chart_1: "#777777",
          chart_2: "#777777",
          chart_3: "#777777",
        },
        dark: {
          foreground: "#888888",
          background: "#888888",
          card_foreground: "#888888",
          card: "#888888",
          primary_foreground: "#888888",
          primary: "#888888",
          accent_foreground: "#888888",
          accent: "#888888",
          sidebar_foreground: "#888888",
          sidebar: "#888888",
          border: "#888888",
          chart_1: "#888888",
          chart_2: "#888888",
          chart_3: "#888888",
        },
      },
    },
  }
  const errors = validateCustomTheme(unsafe)
  assert.ok(errors.some((error) => error.includes("custom_tokens/light")))
  assert.ok(errors.some((error) => error.includes("custom_tokens/dark")))
  assert.deepEqual(validateCustomTheme({ theme: { preset: "sage" } }), [])
})
