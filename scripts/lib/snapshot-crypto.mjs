import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const FORMAT = "zaati-encrypted-snapshot"
const VERSION = 1
const ALGORITHM = "aes-256-gcm"
const AAD = Buffer.from("zaati-os:snapshot:v1", "utf8")

function decodeKey(value) {
  if (Buffer.isBuffer(value)) {
    if (value.length !== 32) throw new Error("Snapshot encryption key must contain exactly 32 bytes.")
    return value
  }
  const normalized = String(value || "").trim()
  const key = /^[a-f0-9]{64}$/i.test(normalized) ? Buffer.from(normalized, "hex") : Buffer.from(normalized, "base64url")
  if (key.length !== 32) throw new Error("ZAATI_SNAPSHOT_KEY must be a 32-byte base64url or hexadecimal value.")
  return key
}

export function snapshotKeyId(value) {
  return createHash("sha256").update(decodeKey(value)).digest("hex").slice(0, 12)
}

export async function loadSnapshotKey({ keyFile = process.env.ZAATI_SNAPSHOT_KEY_FILE || ".zaati/snapshot.key" } = {}) {
  if (process.env.ZAATI_SNAPSHOT_KEY) return decodeKey(process.env.ZAATI_SNAPSHOT_KEY)
  const value = await readFile(path.resolve(keyFile), "utf8").catch((error) => {
    if (error.code === "ENOENT")
      throw new Error("Snapshot encryption is enabled, but no key was found. Set ZAATI_SNAPSHOT_KEY or run npm run snapshot:keygen.")
    throw error
  })
  return decodeKey(value)
}

export async function generateSnapshotKey({ target = ".zaati/snapshot.key", force = false } = {}) {
  const absolute = path.resolve(target)
  await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 })
  const key = randomBytes(32)
  await writeFile(absolute, `${key.toString("base64url")}\n`, { flag: force ? "w" : "wx", mode: 0o600 })
  return { path: absolute, keyId: snapshotKeyId(key) }
}

export function encryptSnapshot(snapshot, value) {
  const key = decodeKey(value)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  cipher.setAAD(AAD)
  const plaintext = Buffer.from(JSON.stringify(snapshot), "utf8")
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return {
    format: FORMAT,
    version: VERSION,
    algorithm: ALGORITHM,
    key_id: snapshotKeyId(key),
    iv: iv.toString("base64url"),
    auth_tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  }
}

export function decryptSnapshotEnvelope(envelope, value) {
  const keys = envelope && typeof envelope === "object" ? Object.keys(envelope).sort() : []
  const expectedKeys = ["algorithm", "auth_tag", "ciphertext", "format", "iv", "key_id", "version"]
  if (
    !envelope ||
    envelope.format !== FORMAT ||
    envelope.version !== VERSION ||
    envelope.algorithm !== ALGORITHM ||
    keys.join(",") !== expectedKeys.join(",")
  ) {
    throw new Error("Unsupported encrypted snapshot envelope.")
  }
  if (
    !/^[a-f0-9]{12}$/.test(envelope.key_id) ||
    !/^[A-Za-z0-9_-]{16}$/.test(envelope.iv) ||
    !/^[A-Za-z0-9_-]{22}$/.test(envelope.auth_tag) ||
    !/^[A-Za-z0-9_-]+$/.test(envelope.ciphertext) ||
    envelope.ciphertext.length > 8_000_000
  )
    throw new Error("Malformed encrypted snapshot envelope.")
  const key = decodeKey(value)
  if (envelope.key_id !== snapshotKeyId(key)) throw new Error("The configured snapshot key does not match this encrypted file.")
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, "base64url"))
    decipher.setAAD(AAD)
    decipher.setAuthTag(Buffer.from(envelope.auth_tag, "base64url"))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64url")), decipher.final()])
    return JSON.parse(plaintext.toString("utf8"))
  } catch {
    throw new Error("Encrypted snapshot authentication failed. The file may be corrupted or the key may be wrong.")
  }
}
