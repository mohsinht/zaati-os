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

async function candidateRepository() {
  const repository = await mkdtemp(path.join(tmpdir(), "zaati-data-gate-"))
  const bundle = JSON.parse(await createMockBundle())
  const contracts = await loadContracts(root)
  const written = await persistBundle(bundle, { outputRoot: path.join(repository, "data/snapshots"), contracts })
  const relative = written.map((file) => path.relative(repository, file).split(path.sep).join("/"))
  await writeFile(
    path.join(repository, "zaati.data.json"),
    `${JSON.stringify({
      contract_version: "0.1.1",
      code_repository: "example/zaati-os",
      code_ref: "a".repeat(40),
      workflow_id: "daily-core",
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

    const config = JSON.parse(await readFile(path.join(repository, "zaati.data.json"), "utf8"))
    config.snapshot_encryption = true
    await writeFile(path.join(repository, "zaati.data.json"), JSON.stringify(config))
    await writeFile(path.join(repository, ".zaati-changed-files"), `${relative.join("\n")}\n`)
    await assert.rejects(() => validate(repository), /encryption mode does not match/)
  } finally {
    await rm(repository, { recursive: true, force: true })
  }
})
