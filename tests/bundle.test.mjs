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

const synthetic = { allowSynthetic: true }

test("one provider run validates and atomically persists several snapshots", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-bundle-"))
  try {
    const bundle = JSON.parse(await createMockBundle())
    const contracts = await loadContracts()
    await assertValidBundle(bundle, contracts, synthetic)
    const files = await persistBundle(bundle, { outputRoot: workspace, contracts, ...synthetic })
    assert.equal(files.length, 6)
    assert.ok(files.every((file) => file.startsWith(workspace) && file.endsWith(".json")))
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test("an invalid nested snapshot rejects the whole bundle before writes", async () => {
  const bundle = JSON.parse(await createMockBundle())
  bundle.snapshots.push(bundle.snapshots[0])
  const errors = await validateBundle(bundle, undefined, synthetic)
  assert.ok(errors.some((error) => error.includes("source appears more than once")))
})

test("a partial or self-shrunk bundle cannot pass an authoritative workflow contract", async () => {
  const bundle = JSON.parse(await createMockBundle())
  const expected = [...bundle.expected_source_ids]
  bundle.snapshots = bundle.snapshots.slice(0, 1)
  const missing = await validateBundle(bundle, undefined, { expectedSourceIds: expected, ...synthetic })
  assert.ok(missing.some((error) => error.includes("missing expected sources")))

  bundle.expected_source_ids = [bundle.snapshots[0].source_id]
  const selfShrunk = await validateBundle(bundle, undefined, { expectedSourceIds: expected, ...synthetic })
  assert.ok(selfShrunk.some((error) => error.includes("omits authoritative sources")))
})

test("snapshot strings are scanned for credentials before persistence", async () => {
  const bundle = JSON.parse(await createMockBundle())
  bundle.snapshots[0].data.summary = `Synthetic leak ${"sk-proj-"}${"x".repeat(24)}`
  const errors = await validateBundle(bundle, undefined, { expectedSourceIds: bundle.expected_source_ids, ...synthetic })
  assert.ok(errors.some((error) => error.includes("possible OpenAI-style key")))
  assert.ok(errors.every((error) => !error.includes("x".repeat(24))))

  bundle.snapshots[0].data.summary = `api_key=${"a".repeat(20)}`
  const generic = await validateBundle(bundle, undefined, { expectedSourceIds: bundle.expected_source_ids, ...synthetic })
  assert.ok(generic.some((error) => error.includes("embedded credential")))

  bundle.snapshots[0].data.summary = `Token ${"github_pat_"}${"A".repeat(40)}`
  const github = await validateBundle(bundle, undefined, { expectedSourceIds: bundle.expected_source_ids, ...synthetic })
  assert.ok(github.some((error) => error.includes("GitHub fine-grained token")))

  bundle.snapshots[0].data.summary = `Token ${"npm_"}${"B".repeat(36)}`
  const npm = await validateBundle(bundle, undefined, { expectedSourceIds: bundle.expected_source_ids, ...synthetic })
  assert.ok(npm.some((error) => error.includes("npm access token")))
})

test("source-specific content guards reject raw messages and account numbers", async () => {
  const inboxBundle = JSON.parse(await createMockBundle())
  inboxBundle.snapshots.find((item) => item.source_id === "inbox:attention").data.summary =
    "From: Example sender\nTo: Example recipient\nSubject: Full copied message\nDate: Today\n" + "Body ".repeat(40)
  assert.ok((await validateBundle(inboxBundle, undefined, synthetic)).some((error) => error.includes("raw-email content guard")))

  const moneyBundle = JSON.parse(await createMockBundle())
  moneyBundle.snapshots.find((item) => item.source_id === "money:pulse").data.summary = "Account 123456789012 should not be stored."
  assert.ok((await validateBundle(moneyBundle, undefined, synthetic)).some((error) => error.includes("account-number content guard")))
})

test("aggregate dependencies must follow direct candidates", async () => {
  const bundle = JSON.parse(await createMockBundle())
  bundle.snapshots.reverse()
  const errors = await validateBundle(bundle, undefined, synthetic)
  assert.ok(errors.some((error) => error.includes("must appear earlier in the bundle")))
})

test("encrypted snapshots authenticate round trips and reject tampering", () => {
  const key = randomBytes(32)
  const snapshot = { snapshot_id: "example:daily:2026-08-24", data: { value: 42 } }
  const envelope = encryptSnapshot(snapshot, key)
  assert.deepEqual(decryptSnapshotEnvelope(envelope, key), snapshot)
  const replacement = envelope.ciphertext.startsWith("A") ? "B" : "A"
  const tampered = { ...envelope, ciphertext: `${replacement}${envelope.ciphertext.slice(1)}` }
  assert.throws(() => decryptSnapshotEnvelope(tampered, key), /authentication failed/)
  assert.throws(() => decryptSnapshotEnvelope(envelope, randomBytes(32)), /does not match/)
})

test("encrypted bundle persistence never creates plaintext snapshot files", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "zaati-encrypted-"))
  const key = randomBytes(32)
  try {
    const bundle = JSON.parse(await createMockBundle())
    const files = await persistBundle(bundle, { outputRoot: workspace, encryption: true, key, ...synthetic })
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
    bundle.expected_source_ids = ["agenda:primary"]
    await assert.rejects(() => persistBundle(bundle, { outputRoot: workspace, ...synthetic }), /symbolic links/)
  } finally {
    await rm(workspace, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test("every bundle boundary enforces the shared privacy and temporal policy", async () => {
  const bundle = JSON.parse(await createMockBundle())
  const snapshot = bundle.snapshots.find((item) => item.source_id === "inbox:attention")
  bundle.snapshots = [snapshot]
  bundle.expected_source_ids = [snapshot.source_id]
  snapshot.generated_at = "2099-01-02T00:00:00Z"
  snapshot.effective_period = { start: "2099-01-03T00:00:00Z", end: "2099-01-02T00:00:00Z", timezone: "Mars/Olympus" }
  snapshot.sources[0].as_of = "2199-01-01T00:00:00Z"
  snapshot.freshness.expires_at = "2199-01-01T00:00:00Z"
  snapshot.privacy = { classification: "public", contains_personal_data: false, synthetic: true }

  const errors = await validateBundle(bundle, undefined, { expectedSourceIds: bundle.expected_source_ids })
  for (const expected of [
    "cannot claim synthetic",
    "start must not be after end",
    "valid IANA timezone",
    "exceeds the 30-hour source SLA",
    "within 60 minutes of the bundle generation time",
    "cannot be later than generated_at",
  ])
    assert.ok(
      errors.some((error) => error.includes(expected)),
      `missing policy error: ${expected}`,
    )
})
