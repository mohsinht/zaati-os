import { access, readFile, readdir } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import Ajv2020 from "ajv/dist/2020.js"
import addFormats from "ajv-formats"
import { decryptSnapshotEnvelope, loadSnapshotKey } from "./lib/snapshot-crypto.mjs"

const root = process.cwd()
const errors = []
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))

async function discoverSnapshots(directory) {
  try {
    const entries = await readdir(path.join(root, directory), { withFileTypes: true })
    const nested = await Promise.all(entries.map((entry) => {
      const relative = path.join(directory, entry.name)
      return entry.isDirectory() ? discoverSnapshots(relative) : relative.endsWith(".json") || relative.endsWith(".json.enc") ? [relative] : []
    }))
    return nested.flat()
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}

function formatAjvErrors(file, validationErrors = []) {
  return validationErrors.map((item) => `${file}${item.instancePath || "/"}: ${item.message}`)
}

function walk(value, visit, trail = []) {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, visit, [...trail, index]))
  if (!value || typeof value !== "object") return
  for (const [key, child] of Object.entries(value)) {
    visit(key, child, [...trail, key])
    walk(child, visit, [...trail, key])
  }
}

function findCycle(id, byId, visiting = new Set(), visited = new Set()) {
  if (visiting.has(id)) return [...visiting, id]
  if (visited.has(id)) return null
  visiting.add(id)
  for (const dependency of byId.get(id)?.depends_on || []) {
    const cycle = findCycle(dependency, byId, new Set(visiting), visited)
    if (cycle) return cycle
  }
  visited.add(id)
  return null
}

const schemaPaths = [
  "schemas/ui-blocks.schema.json",
  "schemas/snapshot.schema.json",
  "schemas/snapshot-bundle.schema.json",
  "schemas/encrypted-snapshot.schema.json",
  "schemas/source-registry.schema.json",
  "schemas/instance.schema.json",
  "schemas/workflow-registry.schema.json",
  "schemas/domains/generic.schema.json",
]
const schemas = await Promise.all(schemaPaths.map(readJson))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
schemas.forEach((schema) => ajv.addSchema(schema))

const registry = await readJson("config/sources.json")
const validateRegistry = ajv.getSchema("https://zaati-os.dev/schemas/source-registry.schema.json")
if (!validateRegistry(registry)) errors.push(...formatAjvErrors("config/sources.json", validateRegistry.errors))

const ids = new Set()
const workers = new Set()
const byId = new Map(registry.sources.map((source) => [source.id, source]))
for (const source of registry.sources) {
  if (ids.has(source.id)) errors.push(`config/sources.json: duplicate source ID ${source.id}`)
  if (workers.has(source.worker_id)) errors.push(`config/sources.json: duplicate worker ID ${source.worker_id}`)
  ids.add(source.id)
  workers.add(source.worker_id)
  if (source.id !== `${source.domain}:${source.source}`) errors.push(`config/sources.json: ${source.id} does not match domain and source`)
  for (const dependency of source.depends_on) {
    if (!byId.has(dependency)) errors.push(`config/sources.json: ${source.id} depends on unknown source ${dependency}`)
    if (dependency === source.id) errors.push(`config/sources.json: ${source.id} cannot depend on itself`)
  }
  for (const file of [source.prompt, source.schema_ref]) {
    try { await access(path.join(root, file)) } catch { errors.push(`config/sources.json: ${source.id} references missing file ${file}`) }
  }
}
for (const id of ids) {
  const cycle = findCycle(id, byId)
  if (cycle) { errors.push(`config/sources.json: dependency cycle ${cycle.join(" -> ")}`); break }
}

const workflowRegistry = await readJson("config/workflows.json")
const validateWorkflows = ajv.getSchema("https://zaati-os.dev/schemas/workflow-registry.schema.json")
if (!validateWorkflows(workflowRegistry)) errors.push(...formatAjvErrors("config/workflows.json", validateWorkflows.errors))
const workflowIds = new Set()
for (const workflow of workflowRegistry.workflows || []) {
  if (workflowIds.has(workflow.id)) errors.push(`config/workflows.json: duplicate workflow ID ${workflow.id}`)
  workflowIds.add(workflow.id)
  for (const sourceId of workflow.source_ids) if (!byId.has(sourceId)) errors.push(`config/workflows.json: ${workflow.id} contains unknown source ${sourceId}`)
  try { await access(path.join(root, workflow.prompt)) } catch { errors.push(`config/workflows.json: ${workflow.id} references missing prompt ${workflow.prompt}`) }
}

const instancePath = await access(path.join(root, "config/instance.local.json")).then(() => "config/instance.local.json").catch(() => "config/instance.example.json")
const instance = await readJson(instancePath)
const validateInstance = ajv.getSchema("https://zaati-os.dev/schemas/instance.schema.json")
if (!validateInstance(instance)) errors.push(...formatAjvErrors(instancePath, validateInstance.errors))
for (const sourceId of instance.enabled_sources || []) if (!byId.has(sourceId)) errors.push(`${instancePath}: unknown enabled source ${sourceId}`)

const privateRoot = process.env.ZAATI_DATA_DIR || "data/snapshots"
const tutorialMode = process.env.ZAATI_TUTORIAL_MODE === "true"
const privateFiles = await discoverSnapshots(privateRoot)
const exampleFiles = await discoverSnapshots("data/examples")
const snapshotFiles = [...exampleFiles, ...privateFiles]
const encryptedFiles = privateFiles.filter((file) => file.endsWith(".enc"))
if (!tutorialMode && instance.storage?.snapshot_encryption && privateFiles.some((file) => !file.endsWith(".enc"))) errors.push(`${privateRoot}: encryption is enabled but plaintext snapshots were found`)
if (!tutorialMode && !instance.storage?.snapshot_encryption && encryptedFiles.length) errors.push(`${privateRoot}: encrypted snapshots require storage.snapshot_encryption`)
const snapshotKey = encryptedFiles.length && instance.storage?.snapshot_encryption ? await loadSnapshotKey().catch((error) => { errors.push(error.message); return null }) : null
const validateSnapshot = ajv.getSchema("https://zaati-os.dev/schemas/snapshot.schema.json")
const unsafeKey = /(?:^|[_-])(password|passwd|secret|cookie|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|private[_-]?key)(?:$|[_-])/i
const unsafeText = /<script\b|javascript:|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i

for (const file of snapshotFiles) {
  let snapshot
  try {
    const payload = await readJson(file)
    snapshot = file.endsWith(".enc") ? decryptSnapshotEnvelope(payload, snapshotKey) : payload
  } catch (error) { errors.push(`${file}: invalid or unreadable snapshot, ${error.message}`); continue }
  if (!validateSnapshot(snapshot)) errors.push(...formatAjvErrors(file, validateSnapshot.errors))
  const registration = byId.get(snapshot.source_id)
  if (!registration) { errors.push(`${file}: unregistered source ${snapshot.source_id}`); continue }
  if (snapshot.domain !== registration.domain || snapshot.source !== registration.source) errors.push(`${file}: domain and source do not match ${snapshot.source_id}`)
  if (snapshot.producer?.worker_id !== registration.worker_id) errors.push(`${file}: producer must be ${registration.worker_id}`)
  if (snapshot.schema_ref !== registration.schema_ref) errors.push(`${file}: schema_ref must be ${registration.schema_ref}`)
  for (const dependency of registration.depends_on) {
    if (!snapshot.sources?.some((source) => source.reference === dependency || source.reference?.startsWith(`${dependency}:`))) errors.push(`${file}: aggregate must record dependency ${dependency} in sources`)
  }
  const expectedDate = path.basename(file, file.endsWith(".enc") ? ".json.enc" : ".json")
  if (snapshot.snapshot_id !== `${snapshot.source_id}:${expectedDate}`) errors.push(`${file}: snapshot_id must end with the file date`)
  if (file.startsWith("data/examples/") && (!snapshot.privacy?.synthetic || snapshot.privacy?.contains_personal_data || snapshot.privacy?.classification !== "public")) {
    errors.push(`${file}: examples must be public, synthetic, and contain no personal data`)
  }
  if (privateFiles.includes(file)) {
    const logicalExpected = registration.target_path
      .replace("{YYYY}", expectedDate.slice(0, 4))
      .replace("{MM}", expectedDate.slice(5, 7))
      .replace("{YYYY-MM-DD}", expectedDate)
    const expected = logicalExpected.replace(/^data[/\\]snapshots/, privateRoot) + (file.endsWith(".enc") ? ".enc" : "")
    if (file !== expected) errors.push(`${file}: worker ${registration.worker_id} owns ${expected}`)
    if (snapshot.privacy?.synthetic && process.env.ZAATI_TUTORIAL_MODE !== "true") errors.push(`${file}: real snapshot paths cannot claim synthetic data`)
    const privacyRank = { public: 0, private: 1, sensitive: 2 }
    if (!snapshot.privacy?.synthetic && (privacyRank[snapshot.privacy?.classification] ?? -1) < privacyRank[registration.privacy.expected_classification]) errors.push(`${file}: privacy classification is weaker than ${registration.privacy.expected_classification}`)
  }
  if (Date.parse(snapshot.effective_period?.start) > Date.parse(snapshot.effective_period?.end)) errors.push(`${file}: effective period starts after it ends`)
  if (Date.parse(snapshot.generated_at) >= Date.parse(snapshot.freshness?.expires_at)) errors.push(`${file}: freshness expiration must be after generation`)
  if (snapshot.status !== "success" && !snapshot.quality?.warnings?.length) errors.push(`${file}: partial or failed snapshots require a warning`)
  const domainSchema = schemas.find((schema) => schema.$id?.endsWith(snapshot.schema_ref.replace("schemas/", "/schemas/"))) || await readJson(snapshot.schema_ref).catch(() => null)
  if (domainSchema && !ajv.getSchema(domainSchema.$id)) ajv.addSchema(domainSchema)
  const validateDomain = domainSchema ? ajv.getSchema(domainSchema.$id) : null
  if (!validateDomain) errors.push(`${file}: cannot load ${snapshot.schema_ref}`)
  else if (!validateDomain(snapshot.data)) errors.push(...formatAjvErrors(`${file}#data`, validateDomain.errors))
  const blockIds = snapshot.data?.presentation?.blocks?.map((block) => block.id) || []
  if (new Set(blockIds).size !== blockIds.length) errors.push(`${file}: presentation block IDs must be unique`)
  walk(snapshot, (key, value, trail) => {
    if (unsafeKey.test(key)) errors.push(`${file}#/${trail.join("/")}: secret-shaped keys are forbidden`)
    if (typeof value === "string" && unsafeText.test(value)) errors.push(`${file}#/${trail.join("/")}: executable or private-key text is forbidden`)
  })
}

if (!snapshotFiles.length) errors.push("No snapshots found. Keep synthetic examples or add ignored private snapshots.")
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exit(1)
}
console.log(`Validated ${registry.sources.length} sources, ${snapshotFiles.length} snapshots, schemas, ownership, and safe UI blocks.`)
