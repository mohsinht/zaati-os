import { chmod, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { createInterface } from "node:readline/promises"
import { generateSnapshotKey } from "./lib/snapshot-crypto.mjs"

const target = path.resolve("config/instance.local.json")
const force = process.argv.includes("--force")
const defaults = JSON.parse(await readFile(path.resolve("config/instance.example.json"), "utf8"))
const exists = await readFile(target)
  .then(() => true)
  .catch((error) => (error.code === "ENOENT" ? false : Promise.reject(error)))
if (exists && !force) throw new Error("Setup already exists. Use npm run setup -- --force to replace the ignored local configuration.")

let config = defaults
let encryption = false
if (process.stdin.isTTY && !process.argv.includes("--yes")) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (label, fallback) => (await prompt.question(`${label} (${fallback}): `)).trim() || fallback
  const confirm = async (label, fallback = false) => {
    const answer = (await prompt.question(`${label} (${fallback ? "Y/n" : "y/N"}): `)).trim().toLowerCase()
    return answer ? answer === "y" || answer === "yes" : fallback
  }
  console.log("\n1 of 3, make it yours")
  const brandName = await ask("Dashboard name", defaults.brand_name)
  const brandMark = await ask("Short brand mark", brandName.trim().slice(0, 1).toUpperCase() || defaults.brand_mark)
  const timezone = await ask("IANA timezone", defaults.timezone)
  const locale = await ask("Locale", defaults.locale)
  const currency = (await ask("ISO currency", defaults.currency)).toUpperCase()

  console.log("\n2 of 3, choose a calm starting point")
  const pack = await ask("Source pack: essential, everyday, all", "everyday")
  const packs = {
    essential: ["overview:daily", "agenda:primary", "work:focus"],
    everyday: ["overview:daily", "agenda:primary", "inbox:attention", "work:focus", "money:pulse", "news:briefing"],
    all: defaults.enabled_sources,
  }

  console.log("\n3 of 3, choose the look and security")
  const preset = await ask("Palette: sage, ocean, plum, sand", defaults.theme.preset)
  const fontFamily = await ask("Font: system, humanist, editorial, rounded, mono", defaults.theme.font_family)
  const headingStyle = await ask("Headers: plain, compact, expressive", defaults.theme.heading_style)
  encryption = await confirm("Encrypt private snapshot files at rest", false)
  prompt.close()
  config = {
    ...defaults,
    brand_name: brandName,
    brand_mark: brandMark,
    timezone,
    locale,
    currency,
    enabled_sources: packs[pack] || packs.everyday,
    theme: { ...defaults.theme, preset, font_family: fontFamily, heading_style: headingStyle },
    storage: { snapshot_encryption: encryption },
  }
}

await writeFile(target, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
await chmod(target, 0o600)
if (encryption) {
  await generateSnapshotKey().catch((error) => {
    if (error.code !== "EEXIST") throw error
  })
}
console.log("\nVoila. Your ignored local configuration is ready.")
console.log("Next: npm run tutorial, then read docs/tutorials/one-task-daily-bundle.md when you want real sources.")
