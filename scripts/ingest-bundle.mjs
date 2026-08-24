import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { assertValidBundle, loadContracts, persistBundle } from "./lib/bundle-contract.mjs"

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

async function stdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString("utf8")
}

if (process.argv.includes("--help")) {
  console.log(`Usage:
  npm run snapshot:ingest -- --input bundle.json [--output-dir data/snapshots] [--encrypt]
  your-llm-command | npm run snapshot:ingest -- --output-dir data/snapshots

The entire bundle is validated before any snapshot is replaced. Use --dry-run to validate without writing.`)
  process.exit(0)
}

const input = option("input")
if (!input && process.stdin.isTTY) throw new Error("Provide --input or pipe one exact JSON bundle over stdin.")
const content = input ? await readFile(path.resolve(input), "utf8") : await stdin()
let bundle
try {
  bundle = JSON.parse(content)
} catch {
  throw new Error("Bundle input must be exact JSON without Markdown fences or commentary.")
}
const contracts = await loadContracts()
try {
  await assertValidBundle(bundle, contracts)
} catch (error) {
  if (error.validationErrors) console.error(error.validationErrors.map((item) => `- ${item}`).join("\n"))
  throw error
}
if (process.argv.includes("--dry-run")) {
  console.log(`Validated one atomic bundle containing ${bundle.snapshots.length} snapshots. Nothing was written.`)
  process.exit(0)
}
const files = await persistBundle(bundle, {
  outputRoot: option("output-dir", "data/snapshots"),
  encryption: process.argv.includes("--encrypt"),
  contracts,
})
console.log(`Atomically ingested ${files.length} snapshots without logging their contents.`)
