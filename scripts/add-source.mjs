import { access, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const values = process.argv.slice(2)
const options = Object.fromEntries(
  values.reduce((pairs, value, index) => (value.startsWith("--") ? [...pairs, [value.slice(2), values[index + 1]]] : pairs), []),
)
if (options.help || values.length === 0) {
  console.log(`Usage:
  npm run source:add -- \\
    --domain habits --source daily --label "Daily habits" \\
    --description "Small habit signals and streaks" \\
    --authorized-inputs "User-approved habit check-ins" \\
    --forbidden-inputs "Medical diagnoses, private journal text"

Optional: --worker-id, --cadence, --freshness, --role, --depends-on, --workflow daily-core`)
  process.exit(0)
}
const required = ["domain", "source", "label", "description", "authorized-inputs", "forbidden-inputs"]
const missing = required.filter((key) => !options[key])
if (missing.length) throw new Error(`Missing options: ${missing.join(", ")}`)
const slug = /^[a-z0-9-]+$/
if (!slug.test(options.domain) || !slug.test(options.source)) throw new Error("Domain and source must be lowercase slugs.")
const id = `${options.domain}:${options.source}`
const workerId = options["worker-id"] || `${options.domain}-${options.source}-daily`
if (!slug.test(workerId)) throw new Error("Worker ID must be a lowercase slug.")
const registryPath = path.resolve("config/sources.json")
const registry = JSON.parse(await readFile(registryPath, "utf8"))
if (registry.sources.some((item) => item.id === id || item.worker_id === workerId))
  throw new Error("Source ID or worker ID already exists.")
const domainHasPrimary = registry.sources.some((item) => item.domain === options.domain && item.dashboard_role === "primary")
const dependencies = options["depends-on"]
  ? options["depends-on"]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  : []
for (const dependency of dependencies)
  if (!registry.sources.some((item) => item.id === dependency)) throw new Error(`Unknown dependency ${dependency}`)
const promptPath = `prompts/${workerId}.md`
const workflowPath = path.resolve("config/workflows.json")
const workflows = JSON.parse(await readFile(workflowPath, "utf8"))
const selectedWorkflow = options.workflow ? workflows.workflows.find((item) => item.id === options.workflow) : null
if (options.workflow && !selectedWorkflow) throw new Error(`Unknown workflow ${options.workflow}.`)
await access(path.resolve(promptPath))
  .then(() => {
    throw new Error(`${promptPath} already exists.`)
  })
  .catch((error) => {
    if (error.code !== "ENOENT") throw error
  })
const registration = {
  id,
  domain: options.domain,
  source: options.source,
  label: options.label,
  description: options.description,
  worker_id: workerId,
  prompt: promptPath,
  schema_ref: "schemas/domains/generic.schema.json",
  cadence: options.cadence || "daily",
  freshness_sla_hours: Number(options.freshness || 30),
  dashboard_role: options.role || (domainHasPrimary ? "supporting" : "primary"),
  depends_on: dependencies,
  target_path: `data/snapshots/${options.domain}/${options.source}/{YYYY}/{MM}/{YYYY-MM-DD}.json`,
  privacy: {
    expected_classification: "private",
    authorized_inputs: options["authorized-inputs"].split(",").map((item) => item.trim()),
    forbidden_inputs: options["forbidden-inputs"].split(",").map((item) => item.trim()),
  },
}
registry.sources.push(registration)
if (selectedWorkflow && !selectedWorkflow.source_ids.includes(id)) selectedWorkflow.source_ids.push(id)
const prompt = `# ${options.label} worker

Use this together with \`prompts/base-worker.md\`.

## Registration

- Source ID: \`${id}\`
- Worker ID: \`${workerId}\`
- Owned target: \`${registration.target_path}\`
- Domain schema: \`${registration.schema_ref}\`
- Freshness: ${registration.freshness_sla_hours} hours

## Purpose

${options.description}

## Authorized inputs

${registration.privacy.authorized_inputs.map((item) => `- ${item}`).join("\n")}

## Forbidden inputs

${registration.privacy.forbidden_inputs.map((item) => `- ${item}`).join("\n")}

## Output guidance

Choose the smallest set of safe UI blocks that helps the user notice, decide, or act. Preserve missing data and warnings. Do not add a visualization just because one is available.
`
await writeFile(promptPath, prompt, { flag: "wx" })
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`)
if (selectedWorkflow) await writeFile(workflowPath, `${JSON.stringify(workflows, null, 2)}\n`)
console.log(
  `Added ${id}, created ${promptPath}${selectedWorkflow ? `, and joined ${selectedWorkflow.id}` : ""}. Add one synthetic fixture, then run npm run check.`,
)
