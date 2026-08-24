import { chmod, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { createInterface } from "node:readline/promises"
import { generateSnapshotKey } from "./lib/snapshot-crypto.mjs"
import { detectedDefaults, expandDependencies, validCurrency, validLocale, validTimezone } from "./lib/setup-options.mjs"

const target = path.resolve("config/instance.local.json")
const force = process.argv.includes("--force")
const template = JSON.parse(await readFile(path.resolve("config/instance.example.json"), "utf8"))
const detected = detectedDefaults()
const defaults = { ...template, timezone: detected.timezone, locale: detected.locale, currency: detected.currency }
const registry = JSON.parse(await readFile(path.resolve("config/sources.json"), "utf8"))
const exists = await readFile(target)
  .then(() => true)
  .catch((error) => (error.code === "ENOENT" ? false : Promise.reject(error)))
if (exists && !force) throw new Error("Setup already exists. Use npm run setup -- --force to replace the ignored local configuration.")

let config = defaults
let encryption = false
if (process.stdin.isTTY && !process.argv.includes("--yes")) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (label, fallback) => (await prompt.question(`${label} (${fallback}): `)).trim() || fallback
  const askValid = async (label, fallback, validate, example) => {
    while (true) {
      const answer = await ask(label, fallback)
      if (validate(answer)) return answer
      console.log(`  Not valid. Try ${example}.`)
    }
  }
  const choose = async (label, values, fallback) => {
    while (true) {
      const answer = await ask(`${label}: ${values.join(", ")}`, fallback)
      if (values.includes(answer)) return answer
      console.log(`  Choose one of: ${values.join(", ")}.`)
    }
  }
  const confirm = async (label, fallback = false) => {
    const answer = (await prompt.question(`${label} (${fallback ? "Y/n" : "y/N"}): `)).trim().toLowerCase()
    return answer ? answer === "y" || answer === "yes" : fallback
  }
  console.log("\n1 of 3, make it yours")
  const brandName = await ask("Dashboard name", defaults.brand_name)
  const brandMark = await ask("Short brand mark", brandName.trim().slice(0, 1).toUpperCase() || defaults.brand_mark)
  const timezone = await askValid("IANA timezone", defaults.timezone, validTimezone, "Asia/Karachi")
  const locale = await askValid("Locale", defaults.locale, validLocale, "en-PK")
  const currency = await askValid("ISO currency", defaults.currency, (value) => validCurrency(value.toUpperCase()), "PKR")
  console.log(
    `  Resolved local time: ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date())}`,
  )

  console.log("\n2 of 3, choose a calm starting point")
  const pack = await choose("Source pack", ["essential", "daily", "all"], "daily")
  const packs = {
    essential: ["agenda:primary", "work:focus"],
    daily: ["overview:daily"],
    all: defaults.enabled_sources,
  }

  console.log("\n3 of 3, choose the look and security")
  const preset = await choose("Palette", ["sage", "ocean", "plum", "sand"], defaults.theme.preset)
  const fontFamily = await choose("Font", ["system", "humanist", "editorial", "rounded", "mono"], defaults.theme.font_family)
  const headingStyle = await choose("Headers", ["plain", "compact", "expressive"], defaults.theme.heading_style)
  encryption = await confirm("Encrypt private snapshot files at rest", false)
  prompt.close()
  config = {
    ...defaults,
    brand_name: brandName,
    brand_mark: brandMark,
    timezone,
    locale,
    currency: currency.toUpperCase(),
    enabled_sources: expandDependencies(packs[pack], registry),
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
