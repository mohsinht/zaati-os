import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
async function jsonFiles(directory) {
  try {
    const entries = await readdir(path.join(root, directory), { withFileTypes: true })
    return (await Promise.all(entries.map((entry) => {
      const relative = path.join(directory, entry.name)
      return entry.isDirectory() ? jsonFiles(relative) : relative.endsWith(".json") ? [relative] : []
    }))).flat()
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))
const privateFiles = await jsonFiles("data/snapshots")
const demoMode = privateFiles.length === 0
const files = demoMode ? await jsonFiles("data/examples") : privateFiles
const snapshots = await Promise.all(files.map(readJson))
const registry = await readJson("config/sources.json")
const instance = await readJson(await readFile(path.join(root, "config/instance.local.json"), "utf8").then(() => "config/instance.local.json").catch(() => "config/instance.example.json"))
const enabled = new Set(instance.enabled_sources)
const sourceDefinitions = registry.sources.filter((source) => enabled.has(source.id))
const bySource = Object.fromEntries(sourceDefinitions.map((source) => [source.id, []]))
for (const snapshot of snapshots) if (enabled.has(snapshot.source_id)) bySource[snapshot.source_id].push(snapshot)
for (const values of Object.values(bySource)) values.sort((a, b) => a.generated_at.localeCompare(b.generated_at))
const latest = sourceDefinitions.map((definition) => ({
  definition,
  snapshot: bySource[definition.id]?.at(-1) || null,
}))
const output = {
  generatedAt: new Date().toISOString(),
  demoMode,
  instance,
  sources: latest,
  historyBySource: Object.fromEntries(Object.entries(bySource).map(([id, values]) => [id, values.map((item) => ({ snapshot_id: item.snapshot_id, generated_at: item.generated_at, status: item.status }))])),
}
await mkdir(path.join(root, "src/generated"), { recursive: true })
await writeFile(path.join(root, "src/generated/dashboard-data.json"), `${JSON.stringify(output, null, 2)}\n`)
console.log(`Built ${demoMode ? "synthetic demo" : "private"} dashboard index from ${files.length} snapshots.`)
