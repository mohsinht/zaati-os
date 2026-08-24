import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import test from "node:test"
import { loadContracts, persistBundle } from "../scripts/lib/bundle-contract.mjs"
import { createMockBundle } from "../scripts/lib/mock-provider.mjs"

const execute = promisify(execFile)
const root = path.resolve(import.meta.dirname, "..")

async function candidateRepository({ sourceIds, workflowId = "daily-core" } = {}) {
  const repository = await mkdtemp(path.join(tmpdir(), "zaati-data-gate-"))
  const bundle = JSON.parse(await createMockBundle({ sourceIds }))
  const contracts = await loadContracts(root)
  for (const snapshot of bundle.snapshots) {
    const registration = contracts.registry.sources.find((source) => source.id === snapshot.source_id)
    snapshot.privacy.synthetic = false
    snapshot.privacy.classification = registration.privacy.expected_classification
    snapshot.privacy.contains_personal_data = true
  }
  const written = await persistBundle(bundle, { outputRoot: path.join(repository, "data/snapshots"), contracts })
  const relative = written.map((file) => path.relative(repository, file).split(path.sep).join("/"))
  await writeFile(
    path.join(repository, "zaati.data.json"),
    `${JSON.stringify({
      contract_version: "0.1.1",
      code_repository: "example/zaati-os",
      code_ref: "a".repeat(40),
      workflow_id: workflowId,
      expected_source_ids: bundle.expected_source_ids,
      snapshot_encryption: false,
    })}\n`,
  )
  await writeFile(path.join(repository, ".zaati-changed-files"), `${relative.join("\n")}\n`)
  return { repository, relative }
}

async function validate(repository) {
  return execute(
    process.execPath,
    [
      path.join(root, "scripts/validate-data-repository.mjs"),
      "--repository-root",
      repository,
      "--changed-files",
      path.join(repository, ".zaati-changed-files"),
    ],
    { cwd: repository },
  )
}

test("independent data-repository gate accepts one complete publication", async () => {
  const { repository } = await candidateRepository()
  try {
    const result = await validate(repository)
    assert.match(result.stdout, /exactly 6 registered snapshots/)
  } finally {
    await rm(repository, { recursive: true, force: true })
  }
})

test("independent gate rejects partial and mixed-purpose pull requests", async () => {
  const { repository, relative } = await candidateRepository()
  try {
    await writeFile(path.join(repository, ".zaati-changed-files"), `${relative[0]}\n`)
    await assert.rejects(() => validate(repository), /missing expected sources/)

    await writeFile(path.join(repository, ".zaati-changed-files"), `${relative.join("\n")}\nREADME.md\n`)
    await assert.rejects(() => validate(repository), /cannot modify other paths/)

    await writeFile(path.join(repository, ".zaati-changed-files"), `${relative.join("\n")}\n.github/workflows/validate-snapshots.yml\n`)
    await assert.rejects(() => validate(repository), /cannot modify other paths/)

    await writeFile(path.join(repository, ".zaati-changed-files"), `${relative.join("\n")}\nzaati.data.json\n`)
    await assert.rejects(() => validate(repository), /cannot modify other paths/)

    const config = JSON.parse(await readFile(path.join(repository, "zaati.data.json"), "utf8"))
    config.snapshot_encryption = true
    await writeFile(path.join(repository, "zaati.data.json"), JSON.stringify(config))
    await writeFile(path.join(repository, ".zaati-changed-files"), `${relative.join("\n")}\n`)
    await assert.rejects(() => validate(repository), /encryption mode does not match/)
  } finally {
    await rm(repository, { recursive: true, force: true })
  }
})

test("independent gate supports a Prompt Studio one-source contract", async () => {
  const { repository } = await candidateRepository({ sourceIds: ["money:pulse"], workflowId: "custom" })
  try {
    const result = await validate(repository)
    assert.match(result.stdout, /exactly 1 registered snapshot/)
  } finally {
    await rm(repository, { recursive: true, force: true })
  }
})

test("independent gate rejects a workflow ID with a self-shrunk source contract", async () => {
  const { repository } = await candidateRepository({ sourceIds: ["money:pulse"], workflowId: "daily-core" })
  try {
    await assert.rejects(() => validate(repository), /do not match immutable workflow daily-core/)
  } finally {
    await rm(repository, { recursive: true, force: true })
  }
})

test("data repository initialization matches an explicit Prompt Studio source set", async () => {
  const repository = await mkdtemp(path.join(tmpdir(), "zaati-data-init-"))
  try {
    await execute(
      process.execPath,
      [
        path.join(root, "scripts/init-data-repository.mjs"),
        "--repository-root",
        repository,
        "--code-repository",
        "example/zaati-os",
        "--code-ref",
        "a".repeat(40),
        "--sources",
        "money:pulse",
      ],
      { cwd: root },
    )
    const config = JSON.parse(await readFile(path.join(repository, "zaati.data.json"), "utf8"))
    const workflow = await readFile(path.join(repository, ".github/workflows/validate-snapshots.yml"), "utf8")
    assert.equal(config.workflow_id, "custom")
    assert.deepEqual(config.expected_source_ids, ["money:pulse"])
    assert.match(workflow, /pull_request_target:/)
    assert.match(workflow, new RegExp("a".repeat(40)))
    assert.doesNotMatch(workflow, /VALIDATOR_CODE_REF/)
  } finally {
    await rm(repository, { recursive: true, force: true })
  }
})
