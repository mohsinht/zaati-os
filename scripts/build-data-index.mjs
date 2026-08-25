import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { decryptSnapshotEnvelope, loadSnapshotKey } from "./lib/snapshot-crypto.mjs"
import { assembleStandaloneDemoPrompt } from "./lib/demo-prompt.mjs"
import { snapshotFreshness } from "./lib/freshness.mjs"
import { resolvedExperience } from "./lib/setup-options.mjs"

const root = process.cwd()
async function snapshotFiles(directory) {
  try {
    const entries = await readdir(path.join(root, directory), { withFileTypes: true })
    return (
      await Promise.all(
        entries.map((entry) => {
          const relative = path.join(directory, entry.name)
          return entry.isDirectory()
            ? snapshotFiles(relative)
            : relative.endsWith(".json") || relative.endsWith(".json.enc")
              ? [relative]
              : []
        }),
      )
    ).flat()
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))
const localInstance = await readFile(path.join(root, "config/instance.local.json"), "utf8")
  .then(() => true)
  .catch(() => false)
const rawInstance = await readJson(localInstance ? "config/instance.local.json" : "config/instance.example.json")
const instance = {
  ...rawInstance,
  experience: resolvedExperience(rawInstance, {
    hasLocalConfig: localInstance,
    demoOverride: process.env.ZAATI_DEMO_MODE === "true",
  }),
}
const privateRoot = process.env.ZAATI_DATA_DIR || "data/snapshots"
const tutorialMode = process.env.ZAATI_TUTORIAL_MODE === "true"
const historyLimit = Math.min(366, Math.max(1, Number(process.env.ZAATI_HISTORY_LIMIT || 31)))
if (!Number.isInteger(historyLimit)) throw new Error("ZAATI_HISTORY_LIMIT must be an integer from 1 to 366.")
const privateFiles = await snapshotFiles(privateRoot)
const usingExamples = privateFiles.length === 0 && instance.experience.mode === "demo"
const files = usingExamples ? await snapshotFiles("data/examples") : privateFiles
const encryptedFiles = files.filter((file) => file.endsWith(".enc"))
if (!usingExamples && !tutorialMode && instance.storage.snapshot_encryption && files.some((file) => !file.endsWith(".enc")))
  throw new Error("Snapshot encryption is enabled, but plaintext private snapshots were found.")
if (!usingExamples && !tutorialMode && encryptedFiles.length && !instance.storage.snapshot_encryption)
  throw new Error("Encrypted snapshots were found. Enable storage.snapshot_encryption in the instance configuration.")
const key = encryptedFiles.length ? await loadSnapshotKey() : null
const snapshots = await Promise.all(
  files.map(async (file) =>
    file.endsWith(".enc") ? decryptSnapshotEnvelope(JSON.parse(await readFile(path.join(root, file), "utf8")), key) : readJson(file),
  ),
)
const demoMode = usingExamples
const syntheticData = snapshots.length > 0 && snapshots.every((snapshot) => snapshot.privacy?.synthetic === true)
const registry = await readJson("config/sources.json")
const enabled = new Set(instance.enabled_sources)
const sourceDefinitions = registry.sources.filter((source) => enabled.has(source.id))
const bySource = Object.fromEntries(sourceDefinitions.map((source) => [source.id, []]))
for (const snapshot of snapshots) if (enabled.has(snapshot.source_id)) bySource[snapshot.source_id].push(snapshot)
for (const values of Object.values(bySource)) values.sort((a, b) => a.generated_at.localeCompare(b.generated_at))
const latest = sourceDefinitions.map((definition) => ({
  definition,
  snapshot: bySource[definition.id]?.at(-1) || null,
  freshnessState: snapshotFreshness(bySource[definition.id]?.at(-1) || null),
}))
const demoContract = demoMode
  ? await Promise.all([
      readFile(path.join(root, "prompts/base-worker.md"), "utf8"),
      readJson("schemas/snapshot.schema.json"),
      readJson("schemas/ui-blocks.schema.json"),
      readFile(path.join(root, "docs/llm-contract.md"), "utf8"),
      readFile(path.join(root, "docs/privacy.md"), "utf8"),
    ])
  : null
const demoPromptsBySource = demoMode
  ? Object.fromEntries(
      await Promise.all(
        sourceDefinitions.map(async (definition) => {
          const [domainPrompt, domainSchema] = await Promise.all([
            readFile(path.join(root, definition.prompt), "utf8"),
            readJson(definition.schema_ref),
          ])
          const [basePrompt, snapshotSchema, uiBlocksSchema, llmContract, privacyContract] = demoContract
          return [
            definition.id,
            assembleStandaloneDemoPrompt({
              basePrompt,
              domainPrompt,
              definition,
              snapshotSchema,
              uiBlocksSchema,
              domainSchema,
              llmContract,
              privacyContract,
            }),
          ]
        }),
      ),
    )
  : {}
const exampleKinds = new Set()
const componentExamples = demoMode
  ? snapshots
      .flatMap((snapshot) => (snapshot.data?.presentation?.blocks || []).map((block) => ({ sourceId: snapshot.source_id, block })))
      .filter(({ block }) => {
        if (exampleKinds.has(block.kind)) return false
        exampleKinds.add(block.kind)
        return true
      })
  : []
const output = {
  generatedAt: new Date().toISOString(),
  demoMode,
  syntheticData,
  instance,
  sources: latest,
  historyBySource: Object.fromEntries(Object.entries(bySource).map(([id, values]) => [id, values.slice(-historyLimit)])),
  demoPromptsBySource,
  componentExamples,
}
await mkdir(path.join(root, "public/data"), { recursive: true })
await writeFile(path.join(root, "public/data/dashboard-data.json"), `${JSON.stringify(output)}\n`, { mode: 0o600 })
console.log(`Built ${demoMode ? "synthetic demo" : "private"} dashboard index from ${files.length} snapshots.`)
