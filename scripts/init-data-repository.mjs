import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { normalizeGitHubRepository } from "./lib/prompt-studio.mjs"

const option = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}
const targetOption = option("target") || option("repository-root")
const target = path.resolve(targetOption || "")
const repositoryUrl = normalizeGitHubRepository(option("code-repository") || "")
const codeRepository = repositoryUrl.replace("https://github.com/", "")
const codeRef = option("code-ref") || "v0.1.1"
const workflowId = option("workflow") || "daily-core"
if (!targetOption) throw new Error("Provide the private data repository directory with --target.")
if (!/^(?:[0-9a-f]{40}|v[0-9]+\.[0-9]+\.[0-9]+)$/.test(codeRef))
  throw new Error("--code-ref must be an immutable full commit SHA or version tag.")
const workflows = JSON.parse(await readFile(path.resolve("config/workflows.json"), "utf8"))
const workflow = workflows.workflows.find((item) => item.id === workflowId)
if (!workflow) throw new Error(`Unknown workflow ${workflowId}.`)

const outputs = ["zaati.data.json", ".github/workflows/validate-snapshots.yml"]
for (const relative of outputs) {
  const file = path.join(target, relative)
  const exists = await access(file)
    .then(() => true)
    .catch((error) => (error.code === "ENOENT" ? false : Promise.reject(error)))
  if (exists && !process.argv.includes("--force")) throw new Error(`${file} exists. Use --force only after reviewing its contents.`)
}

const template = await readFile(path.resolve("templates/data-repository/.github/workflows/validate-snapshots.yml"), "utf8")
const workflowText = template.replaceAll("YOUR_USER/zaati-os", codeRepository).replaceAll("v0.1.1", codeRef)
const config = {
  $schema: `https://raw.githubusercontent.com/${codeRepository}/${codeRef}/schemas/data-repository.schema.json`,
  contract_version: "0.1.1",
  code_repository: codeRepository,
  code_ref: codeRef,
  workflow_id: workflowId,
  expected_source_ids: workflow.source_ids,
  snapshot_encryption: process.argv.includes("--encrypt"),
}
await mkdir(path.join(target, ".github/workflows"), { recursive: true })
await writeFile(path.join(target, "zaati.data.json"), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o644 })
await writeFile(path.join(target, ".github/workflows/validate-snapshots.yml"), workflowText, { mode: 0o644 })
console.log(`Prepared an independent ${workflowId} validation gate in ${target}. Review, commit, and require its check on main.`)
