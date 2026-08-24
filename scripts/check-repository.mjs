import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

const root = process.cwd()
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))
const errors = []
const packageJson = await readJson("package.json")
const lock = await readJson("package-lock.json")
const readme = await readFile(path.join(root, "README.md"), "utf8")
const version = packageJson.version

if (lock.lockfileVersion < 3) errors.push("package-lock.json must use lockfile version 3 or newer")
if (lock.packages?.[""]?.version !== version) errors.push("package.json and package-lock.json versions must match")
for (const [group, dependencies] of Object.entries({
  dependencies: packageJson.dependencies,
  devDependencies: packageJson.devDependencies,
})) {
  for (const [name, value] of Object.entries(dependencies || {})) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) errors.push(`${group}.${name} must use an exact version`)
  }
}

if (!readme.includes(`Current version: **v${version}**`)) errors.push("README current version must match package.json")
if (!readme.includes("actions/workflows/ci.yml/badge.svg")) errors.push("README must expose the live CI badge")
if (!readme.includes("actions/workflows/codeql.yml/badge.svg")) errors.push("README must expose the live CodeQL badge")

const workflowDirectory = path.join(root, ".github/workflows")
const workflowFiles = (await readdir(workflowDirectory)).filter((file) => /\.ya?ml$/.test(file))
for (const file of workflowFiles) {
  const workflow = parse(await readFile(path.join(workflowDirectory, file), "utf8"))
  if (!workflow || typeof workflow !== "object") {
    errors.push(`${file}: must contain a YAML object`)
    continue
  }
  if (workflow.pull_request_target || workflow.on?.pull_request_target) errors.push(`${file}: pull_request_target is forbidden`)
  if (!workflow.permissions || typeof workflow.permissions !== "object")
    errors.push(`${file}: top-level least-privilege permissions are required`)
  for (const [jobName, job] of Object.entries(workflow.jobs || {})) {
    if (!job["timeout-minutes"]) errors.push(`${file}#${jobName}: timeout-minutes is required`)
    for (const step of job.steps || []) {
      if (!step.uses) continue
      if (!/^\.\//.test(step.uses) && !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+@v\d+(?:\.\d+\.\d+)?$/.test(step.uses)) {
        errors.push(`${file}#${jobName}: action ${step.uses} must use a reviewed major or exact release`)
      }
      if (step.uses.startsWith("actions/checkout@") && step.with?.["persist-credentials"] !== false) {
        errors.push(`${file}#${jobName}: checkout must disable persisted credentials`)
      }
    }
  }
}

const ci = parse(await readFile(path.join(workflowDirectory, "ci.yml"), "utf8"))
const requiredJobs = ["static-contracts", "unit-coverage", "build-performance", "accessibility", "security-audit"]
const gateNeeds = ci.jobs?.["quality-gate"]?.needs || []
for (const job of requiredJobs) {
  if (!ci.jobs?.[job]) errors.push(`ci.yml: missing required job ${job}`)
  if (!gateNeeds.includes(job)) errors.push(`ci.yml: quality-gate must depend on ${job}`)
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exit(1)
}
console.log(
  `Repository policy passed for ${workflowFiles.length} workflows and ${Object.keys(packageJson.dependencies || {}).length + Object.keys(packageJson.devDependencies || {}).length} exact dependencies.`,
)
