import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { assertValidBundle, loadContracts, persistBundle, validateBundle } from "../scripts/lib/bundle-contract.mjs"
import { createMockBundle } from "../scripts/lib/mock-provider.mjs"
import { decryptSnapshotEnvelope, encryptSnapshot } from "../scripts/lib/snapshot-crypto.mjs"
import { executeWorkflow } from "../scripts/run-workflow.mjs"

test("one provider run validates and atomically persists several snapshots", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-bundle-"))
  try {
    const bundle = JSON.parse(await createMockBundle())
    const contracts = await loadContracts()
    await assertValidBundle(bundle, contracts)
    const files = await persistBundle(bundle, { outputRoot: workspace, contracts })
    assert.equal(files.length, 6)
    assert.ok(files.every((file) => file.startsWith(workspace) && file.endsWith(".json")))
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test("an invalid nested snapshot rejects the whole bundle before writes", async () => {
  const bundle = JSON.parse(await createMockBundle())
  bundle.snapshots.push(bundle.snapshots[0])
  const errors = await validateBundle(bundle)
  assert.ok(errors.some((error) => error.includes("source appears more than once")))
})

test("encrypted snapshots authenticate round trips and reject tampering", () => {
  const key = randomBytes(32)
  const snapshot = { snapshot_id: "example:daily:2026-08-24", data: { value: 42 } }
  const envelope = encryptSnapshot(snapshot, key)
  assert.deepEqual(decryptSnapshotEnvelope(envelope, key), snapshot)
  const tampered = { ...envelope, ciphertext: `${envelope.ciphertext.slice(0, -1)}A` }
  assert.throws(() => decryptSnapshotEnvelope(tampered, key), /authentication failed/)
  assert.throws(() => decryptSnapshotEnvelope(envelope, randomBytes(32)), /does not match/)
})

test("encrypted bundle persistence never creates plaintext snapshot files", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-encrypted-"))
  const key = randomBytes(32)
  try {
    const bundle = JSON.parse(await createMockBundle())
    const files = await persistBundle(bundle, { outputRoot: workspace, encryption: true, key })
    assert.ok(files.every((file) => file.endsWith(".json.enc")))
    const sample = JSON.parse(await readFile(files[0], "utf8"))
    assert.equal(sample.format, "zaati-encrypted-snapshot")
    assert.equal(decryptSnapshotEnvelope(sample, key).source_id, bundle.snapshots[0].source_id)
    const allFiles = await readdir(workspace, { recursive: true })
    assert.equal(allFiles.filter((file) => String(file).endsWith(".json") && !String(file).endsWith(".json.enc")).length, 0)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test("workflow retries invalid LLM output and writes only the valid attempt", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-retry-"))
  try {
    const result = await executeWorkflow({
      adapter: "mock",
      mockFailures: 2,
      maxAttempts: 3,
      outputRoot: workspace,
      encrypt: false,
      command: [],
    })
    assert.equal(result.attempts, 3)
    assert.equal(result.files.length, 6)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test("ingestion rejects a symbolic-link escape inside the output tree", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-symlink-"))
  const outside = await mkdtemp(path.join(tmpdir(), "zaati-outside-"))
  try {
    await mkdir(path.join(workspace, "agenda"), { recursive: true })
    await symlink(outside, path.join(workspace, "agenda", "primary"))
    const bundle = JSON.parse(await createMockBundle())
    bundle.snapshots = bundle.snapshots.filter((snapshot) => snapshot.source_id === "agenda:primary")
    await assert.rejects(() => persistBundle(bundle, { outputRoot: workspace }), /symbolic links/)
  } finally {
    await rm(workspace, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})
