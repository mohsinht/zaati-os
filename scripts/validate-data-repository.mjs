import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import Ajv2020 from "ajv/dist/2020.js"
import { assertValidBundle, loadContracts, targetForSnapshot } from "./lib/bundle-contract.mjs"
import { decryptSnapshotEnvelope, loadSnapshotKey } from "./lib/snapshot-crypto.mjs"

const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}
const codeRoot = path.resolve(import.meta.dirname, "..")
const repositoryRoot = path.resolve(option("repository-root", "."))
const changedFile = path.resolve(option("changed-files", path.join(repositoryRoot, ".zaati-changed-files")))
const configPath = path.join(repositoryRoot, "zaati.data.json")
const config = JSON.parse(await readFile(configPath, "utf8"))
const schema = JSON.parse(await readFile(path.join(codeRoot, "schemas/data-repository.schema.json"), "utf8"))
const validateConfig = new Ajv2020({ allErrors: true, strict: true }).compile(schema)
if (!validateConfig(config)) {
  const reasons = validateConfig.errors.map((error) => `${error.instancePath || "/"}: ${error.message}`).join("; ")
  throw new Error(`Invalid zaati.data.json: ${reasons}`)
}

const changed = (await readFile(changedFile, "utf8"))
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean)
const snapshotPaths = changed.filter((file) => /^data\/snapshots\/.+\.json(?:\.enc)?$/.test(file))
if (!snapshotPaths.length) throw new Error("This pull request contains no snapshot files to validate.")
const unrelated = changed.filter((file) => !file.startsWith("data/snapshots/"))
if (unrelated.length) throw new Error(`Snapshot publication pull requests cannot modify other paths: ${unrelated.join(", ")}`)
if (snapshotPaths.some((relative) => config.snapshot_encryption !== relative.endsWith(".enc")))
  throw new Error("Snapshot encryption mode does not match zaati.data.json.")

const contracts = await loadContracts(codeRoot)
const workflows = JSON.parse(await readFile(path.join(codeRoot, "config/workflows.json"), "utf8"))
const registeredWorkflow = workflows.workflows.find((workflow) => workflow.id === config.workflow_id)
if (config.workflow_id !== "custom" && !registeredWorkflow) throw new Error(`Unknown configured workflow ${config.workflow_id}.`)
if (
  registeredWorkflow &&
  (registeredWorkflow.source_ids.length !== config.expected_source_ids.length ||
    registeredWorkflow.source_ids.some((id, index) => id !== config.expected_source_ids[index]))
)
  throw new Error(`Configured sources do not match immutable workflow ${config.workflow_id}.`)
const registeredIds = new Set(contracts.registry.sources.map((source) => source.id))
const unknownExpected = config.expected_source_ids.filter((id) => !registeredIds.has(id))
if (unknownExpected.length) throw new Error(`Configured source set contains unknown sources: ${unknownExpected.join(", ")}.`)
for (const sourceId of config.expected_source_ids) {
  const registration = contracts.registry.sources.find((source) => source.id === sourceId)
  const missingDependencies = registration.depends_on.filter((dependency) => !config.expected_source_ids.includes(dependency))
  if (missingDependencies.length)
    throw new Error(`Configured source ${sourceId} is missing dependencies: ${missingDependencies.join(", ")}.`)
}
const key = config.snapshot_encryption ? await loadSnapshotKey() : null
const snapshots = []
for (const relative of snapshotPaths) {
  const absolute = path.resolve(repositoryRoot, relative)
  if (!absolute.startsWith(`${repositoryRoot}${path.sep}`)) throw new Error("A changed snapshot path escaped the data repository.")
  const payload = JSON.parse(await readFile(absolute, "utf8"))
  const snapshot = relative.endsWith(".enc") ? decryptSnapshotEnvelope(payload, key) : payload
  const registration = contracts.registry.sources.find((source) => source.id === snapshot.source_id)
  if (!registration) throw new Error(`${relative}: source is not registered.`)
  const expected = targetForSnapshot(registration, snapshot, path.join(repositoryRoot, "data/snapshots"))
  const expectedRelative = path.relative(repositoryRoot, expected) + (config.snapshot_encryption ? ".enc" : "")
  if (relative !== expectedRelative.split(path.sep).join("/")) throw new Error(`${relative}: path does not match registered ownership.`)
  snapshots.push(snapshot)
}
snapshots.sort((left, right) => config.expected_source_ids.indexOf(left.source_id) - config.expected_source_ids.indexOf(right.source_id))

const generatedAt = snapshots
  .map((snapshot) => snapshot.generated_at)
  .sort()
  .at(-1)
const bundle = {
  bundle_version: "0.1.1",
  run_id: `data-repository-pr:${process.env.GITHUB_RUN_ID || "local"}`,
  generated_at: generatedAt,
  expected_source_ids: config.expected_source_ids,
  snapshots,
}
await assertValidBundle(bundle, contracts, { expectedSourceIds: config.expected_source_ids })
console.log(`Validated one independent publication containing exactly ${snapshots.length} registered snapshots.`)
