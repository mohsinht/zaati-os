import { cp, readdir, rm } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const source = path.resolve(process.argv[2] || ".private-data/data/snapshots")
const target = path.resolve("data/snapshots")
const entries = await readdir(source, { withFileTypes: true }).catch(() => [])
if (!entries.some((entry) => entry.isDirectory())) throw new Error("The private data repository contains no domain directories under data/snapshots.")
await rm(target, { recursive: true, force: true })
await cp(source, target, { recursive: true, errorOnExist: false })
console.log("Imported private snapshots without printing their contents.")
