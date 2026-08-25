import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { credentialPatterns } from "./lib/snapshot-safety.mjs"

const root = process.cwd()
const ignored = new Set([".git", ".zaati", "node_modules", "dist", ".wrangler", "coverage"])
const textExtensions = new Set([
  ".json",
  ".md",
  ".mjs",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".jsonc",
  "",
])
const errors = []
const execFileAsync = promisify(execFile)
async function files(directory = ".") {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true })
  return (
    await Promise.all(
      entries
        .filter((entry) => !ignored.has(entry.name))
        .map((entry) => {
          const relative = path.join(directory, entry.name).replace(/^\.\//, "")
          return entry.isDirectory() ? files(relative) : [relative]
        }),
    )
  ).flat()
}
let candidates
try {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  candidates = stdout.split("\0").filter(Boolean)
} catch {
  candidates = (await files()).filter(
    (file) => !file.startsWith("data/snapshots/") && file !== "config/instance.local.json" && !file.startsWith("public/data/"),
  )
}
for (const file of candidates) {
  if (file === ".wrangler.generated.jsonc") continue
  if (file.startsWith("data/snapshots/") && file !== "data/snapshots/README.md")
    errors.push(`${file}: private snapshots must not be committed`)
  if (file === "config/instance.local.json") errors.push(`${file}: local instance configuration must not be committed`)
  if (file.startsWith("src/generated/") && file !== "src/generated/.gitkeep") errors.push(`${file}: generated data must not be committed`)
  if (file.startsWith("public/data/") && file !== "public/data/.gitkeep")
    errors.push(`${file}: generated dashboard data must not be committed`)
  if (!textExtensions.has(path.extname(file))) continue
  const content = await readFile(path.join(root, file), "utf8").catch(() => null)
  if (content === null) continue
  for (const [label, pattern] of credentialPatterns) if (pattern.test(content)) errors.push(`${file}: possible ${label}`)
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exit(1)
}
console.log("Privacy scan passed. No committed private paths or common credential shapes found.")
