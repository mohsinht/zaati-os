import Ajv2020 from "ajv/dist/2020.js"
import addFormats from "ajv-formats"
import { createHash } from "node:crypto"
import { lstat, mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { decryptSnapshotEnvelope, encryptSnapshot, loadSnapshotKey } from "./snapshot-crypto.mjs"
import { scanSnapshot } from "./snapshot-safety.mjs"

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"))
const ajvErrors = (prefix, errors = []) => errors.map((error) => `${prefix}${error.instancePath || "/"}: ${error.message}`)

export async function loadContracts(root = process.cwd()) {
  const registry = await readJson(path.join(root, "config/sources.json"))
  const files = [
    "schemas/ui-blocks.schema.json",
    "schemas/snapshot.schema.json",
    "schemas/snapshot-bundle.schema.json",
    "schemas/domains/domain-base.schema.json",
    ...new Set(registry.sources.map((source) => source.schema_ref)),
  ]
  const [ui, snapshot, bundle, ...domains] = await Promise.all(files.map((file) => readJson(path.join(root, file))))
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
  addFormats(ajv)
  for (const schema of [ui, snapshot, bundle, ...domains]) if (!ajv.getSchema(schema.$id)) ajv.addSchema(schema)
  return { ajv, registry, bundleSchema: bundle, root }
}

export function targetForSnapshot(registration, snapshot, outputRoot = "data/snapshots") {
  const date = snapshot.snapshot_id.slice(-10)
  const relative = registration.target_path
    .replace("data/snapshots", "")
    .replace("{YYYY}", date.slice(0, 4))
    .replace("{MM}", date.slice(5, 7))
    .replace("{YYYY-MM-DD}", date)
    .replace(/^[/\\]/, "")
  const resolvedRoot = path.resolve(outputRoot)
  const target = path.resolve(resolvedRoot, relative)
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`))
    throw new Error("Snapshot target escaped the configured output directory.")
  return target
}

export async function validateBundle(bundle, contracts, { expectedSourceIds } = {}) {
  contracts ||= await loadContracts()
  const errors = []
  const validate = contracts.ajv.getSchema(contracts.bundleSchema.$id)
  if (!validate(bundle)) errors.push(...ajvErrors("bundle", validate.errors))
  if (!Array.isArray(bundle?.snapshots)) return errors
  const declared = Array.isArray(bundle.expected_source_ids) ? bundle.expected_source_ids : []
  const actual = bundle.snapshots.map((snapshot) => snapshot?.source_id).filter(Boolean)
  const authoritative = expectedSourceIds || declared
  const missing = authoritative.filter((sourceId) => !actual.includes(sourceId))
  const extra = actual.filter((sourceId) => !authoritative.includes(sourceId))
  if (missing.length) errors.push(`bundle: missing expected sources ${missing.join(", ")}`)
  if (extra.length) errors.push(`bundle: contains unexpected sources ${extra.join(", ")}`)
  if (expectedSourceIds) {
    const undeclared = expectedSourceIds.filter((sourceId) => !declared.includes(sourceId))
    const unapproved = declared.filter((sourceId) => !expectedSourceIds.includes(sourceId))
    if (undeclared.length) errors.push(`bundle: expected_source_ids omits authoritative sources ${undeclared.join(", ")}`)
    if (unapproved.length) errors.push(`bundle: expected_source_ids contains unapproved sources ${unapproved.join(", ")}`)
  }
  const seen = new Set()
  for (const [index, snapshot] of bundle.snapshots.entries()) {
    const prefix = snapshot?.source_id || "unknown-source"
    if (seen.has(snapshot?.source_id)) errors.push(`${prefix}: source appears more than once in one bundle`)
    seen.add(snapshot?.source_id)
    const registration = contracts.registry.sources.find((item) => item.id === snapshot?.source_id)
    if (!registration) {
      errors.push(`${prefix}: source is not registered`)
      continue
    }
    if (snapshot.domain !== registration.domain || snapshot.source !== registration.source)
      errors.push(`${prefix}: domain or source does not match its registration`)
    if (snapshot.schema_ref !== registration.schema_ref) errors.push(`${prefix}: schema_ref must be ${registration.schema_ref}`)
    if (snapshot.producer?.worker_id !== registration.worker_id) errors.push(`${prefix}: worker_id must be ${registration.worker_id}`)
    for (const dependency of registration.depends_on) {
      const dependencyIndex = actual.indexOf(dependency)
      if (dependencyIndex > index) errors.push(`${prefix}: dependency ${dependency} must appear earlier in the bundle`)
    }
    errors.push(...scanSnapshot(snapshot, { contentGuards: registration.privacy.content_guards || [] }).map((error) => `${prefix}${error}`))
    const domainPath = path.join(contracts.root, registration.schema_ref)
    const domainSchema = await readJson(domainPath).catch(() => null)
    if (!domainSchema) {
      errors.push(`${prefix}: cannot load ${registration.schema_ref}`)
      continue
    }
    if (!contracts.ajv.getSchema(domainSchema.$id)) contracts.ajv.addSchema(domainSchema)
    const validateDomain = contracts.ajv.getSchema(domainSchema.$id)
    if (!validateDomain(snapshot.data)) errors.push(...ajvErrors(`${prefix}#data`, validateDomain.errors))
  }
  return errors
}

export async function assertValidBundle(bundle, contracts, options) {
  const errors = await validateBundle(bundle, contracts, options)
  if (errors.length) {
    const error = new Error(`Snapshot bundle rejected with ${errors.length} validation error${errors.length === 1 ? "" : "s"}.`)
    error.validationErrors = errors
    throw error
  }
  return bundle
}

async function exists(file) {
  return stat(file)
    .then(() => true)
    .catch((error) => (error.code === "ENOENT" ? false : Promise.reject(error)))
}

async function rejectSymlinkPath(root, target) {
  const relative = path.relative(root, target)
  let current = root
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part)
    const info = await lstat(current).catch((error) => (error.code === "ENOENT" ? null : Promise.reject(error)))
    if (info?.isSymbolicLink()) throw new Error("Snapshot output paths cannot contain symbolic links.")
  }
}

export async function persistBundle(bundle, { outputRoot = "data/snapshots", encryption = false, key, contracts, expectedSourceIds } = {}) {
  contracts ||= await loadContracts()
  await assertValidBundle(bundle, contracts, { expectedSourceIds })
  const requestedRoot = path.resolve(outputRoot)
  await mkdir(requestedRoot, { recursive: true, mode: 0o700 })
  const resolvedRoot = await realpath(requestedRoot)
  const zaatiDir = path.resolve(".zaati")
  await mkdir(zaatiDir, { recursive: true, mode: 0o700 })
  const lockId = createHash("sha256").update(resolvedRoot).digest("hex").slice(0, 16)
  const lockPath = path.join(zaatiDir, `ingest-${lockId}.lock`)
  const lock = await open(lockPath, "wx", 0o600).catch((error) => {
    if (error.code === "EEXIST") throw new Error("Another snapshot ingestion is already running.")
    throw error
  })
  const encryptionKey = encryption ? key || (await loadSnapshotKey()) : null
  const transaction = `${process.pid}-${Date.now()}`
  const writes = []
  try {
    for (const snapshot of bundle.snapshots) {
      const registration = contracts.registry.sources.find((item) => item.id === snapshot.source_id)
      const logicalTarget = targetForSnapshot(registration, snapshot, resolvedRoot)
      const target = encryption ? `${logicalTarget}.enc` : logicalTarget
      const alternate = encryption ? logicalTarget : `${logicalTarget}.enc`
      await rejectSymlinkPath(resolvedRoot, path.dirname(target))
      if (await exists(alternate)) throw new Error(`Refusing mixed encrypted and plaintext storage for ${snapshot.source_id}.`)
      if (await exists(target)) {
        const currentPayload = JSON.parse(await readFile(target, "utf8"))
        const current = encryption ? decryptSnapshotEnvelope(currentPayload, encryptionKey) : currentPayload
        if (current.snapshot_id !== snapshot.snapshot_id) throw new Error(`Existing target identity does not match ${snapshot.source_id}.`)
      }
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
      const temporary = `${target}.tmp-${transaction}`
      const backup = `${target}.bak-${transaction}`
      const payload = encryption ? encryptSnapshot(snapshot, encryptionKey) : snapshot
      await writeFile(temporary, `${JSON.stringify(payload)}\n`, { flag: "wx", mode: 0o600 })
      writes.push({ target, temporary, backup, existed: await exists(target), backedUp: false, promoted: false })
    }
    try {
      for (const item of writes) {
        if (item.existed) {
          await rename(item.target, item.backup)
          item.backedUp = true
        }
      }
      for (const item of writes) {
        await rename(item.temporary, item.target)
        item.promoted = true
      }
    } catch (error) {
      for (const item of [...writes].reverse()) {
        if (item.promoted) await rm(item.target, { force: true }).catch(() => {})
        if (item.backedUp) await rename(item.backup, item.target).catch(() => {})
      }
      throw error
    }
    for (const item of writes) if (item.backedUp) await rm(item.backup, { force: true })
    return writes.map((item) => item.target)
  } finally {
    for (const item of writes) {
      await rm(item.temporary, { force: true }).catch(() => {})
    }
    await lock.close()
    await rm(lockPath, { force: true })
  }
}
