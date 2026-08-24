import assert from "node:assert/strict"
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { persistBundle, targetForSnapshot, validateBundle } from "../scripts/lib/bundle-contract.mjs"
import { createMockBundle } from "../scripts/lib/mock-provider.mjs"
import { decryptSnapshotEnvelope, generateSnapshotKey, loadSnapshotKey, snapshotKeyId } from "../scripts/lib/snapshot-crypto.mjs"
import { commandAdapter, executeWorkflow } from "../scripts/run-workflow.mjs"

test("command adapter passes the prompt over stdin and returns stdout", async () => {
  const script =
    "let input=''; process.stdin.on('data', chunk => input += chunk); process.stdin.on('end', () => process.stdout.write(input.toUpperCase()))"
  const result = await commandAdapter([process.execPath, "-e", script], "safe prompt", 2_000)
  assert.equal(result, "SAFE PROMPT")
})

test("command adapter rejects missing commands, nonzero exits, timeouts, and oversized output", async () => {
  assert.throws(() => commandAdapter([], "prompt"), /requires an executable/)
  await assert.rejects(commandAdapter([process.execPath, "-e", "process.exit(7)"], "prompt", 2_000), /exited with code 7/)
  await assert.rejects(commandAdapter([process.execPath, "-e", "setTimeout(() => {}, 5_000)"], "prompt", 20), /timed out after 20 ms/)
  await assert.rejects(
    commandAdapter([process.execPath, "-e", "process.stdout.write('x'.repeat(2_000_001))"], "prompt", 2_000),
    /exceeded the 2 MB safety limit/,
  )
})

test("workflow rejects unknown IDs and invalid retry counts before provider execution", async () => {
  await assert.rejects(executeWorkflow({ workflowId: "missing" }), /Unknown workflow missing/)
  await assert.rejects(executeWorkflow({ workflowId: "daily-core", maxAttempts: 0 }), /between 1 and 5/)
})

test("key generation creates a mode-0600 key that loads from disk", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-key-"))
  const keyFile = path.join(workspace, "snapshot.key")
  try {
    const generated = await generateSnapshotKey({ target: keyFile })
    const key = await loadSnapshotKey({ keyFile })
    assert.equal(key.length, 32)
    assert.equal(generated.keyId, snapshotKeyId(key))
    assert.equal((await stat(keyFile)).mode & 0o777, 0o600)
    await assert.rejects(generateSnapshotKey({ target: keyFile }), /EEXIST/)
  } finally {
    await chmod(workspace, 0o700)
    await rm(workspace, { recursive: true, force: true })
  }
})

test("encryption rejects invalid keys, missing keys, and malformed envelopes", async () => {
  assert.throws(() => snapshotKeyId(Buffer.alloc(31)), /exactly 32 bytes/)
  assert.throws(() => snapshotKeyId("not-a-key"), /32-byte/)
  await assert.rejects(loadSnapshotKey({ keyFile: path.join(tmpdir(), "zaati-key-does-not-exist") }), /no key was found/)
  assert.throws(() => decryptSnapshotEnvelope({ format: "unknown" }, Buffer.alloc(32)), /Unsupported encrypted snapshot envelope/)
})

test("bundle validation rejects unregistered and mismatched source identities", async () => {
  const bundle = JSON.parse(await createMockBundle())
  bundle.snapshots[0].source_id = "unregistered:source"
  const unregistered = await validateBundle(bundle)
  assert.ok(unregistered.some((error) => error.includes("source is not registered")))

  const mismatched = JSON.parse(await createMockBundle())
  mismatched.snapshots[0].producer.worker_id = "wrong-worker"
  mismatched.snapshots[0].schema_ref = "wrong-schema"
  const errors = await validateBundle(mismatched)
  assert.ok(errors.some((error) => error.includes("schema_ref must be")))
  assert.ok(errors.some((error) => error.includes("worker_id must be")))
})

test("persistence rejects path escapes, mixed storage, and target identity conflicts", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-storage-"))
  const bundle = JSON.parse(await createMockBundle())
  bundle.snapshots = bundle.snapshots.filter((snapshot) => snapshot.source_id === "agenda:primary")
  bundle.expected_source_ids = ["agenda:primary"]
  const snapshot = bundle.snapshots[0]
  const registration = {
    target_path: "data/snapshots/../../outside/{YYYY-MM-DD}.json",
  }
  assert.throws(() => targetForSnapshot(registration, snapshot, workspace), /escaped the configured output directory/)

  try {
    const files = await persistBundle(bundle, { outputRoot: workspace })
    const current = JSON.parse(await readFile(files[0], "utf8"))
    current.snapshot_id = "agenda:primary:1999-01-01"
    await writeFile(files[0], JSON.stringify(current))
    await assert.rejects(persistBundle(bundle, { outputRoot: workspace }), /identity does not match/)
    await writeFile(files[0], JSON.stringify(snapshot))
    await assert.rejects(
      persistBundle(bundle, { outputRoot: workspace, encryption: true, key: Buffer.alloc(32) }),
      /mixed encrypted and plaintext/,
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
