import process from "node:process"
import { generateSnapshotKey } from "./lib/snapshot-crypto.mjs"

const targetIndex = process.argv.indexOf("--target")
const target = targetIndex >= 0 ? process.argv[targetIndex + 1] : ".zaati/snapshot.key"
const result = await generateSnapshotKey({ target })
console.log(`Created an ignored snapshot key at ${result.path}. Key ID: ${result.keyId}.`)
console.log("Keep this file private. Supply its value as ZAATI_SNAPSHOT_KEY only in the protected deployment environment.")
