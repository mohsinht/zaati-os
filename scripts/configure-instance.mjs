import { chmod, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { createInterface } from "node:readline/promises"

const target = path.resolve("config/instance.local.json")
const templatePath = path.resolve("config/instance.example.json")
const force = process.argv.includes("--force")
const fromEnvironment = process.argv.includes("--from-env")

async function exists(file) {
  return readFile(file)
    .then(() => true)
    .catch((error) => (error.code === "ENOENT" ? false : Promise.reject(error)))
}
if ((await exists(target)) && !force) throw new Error("config/instance.local.json already exists. Use --force to replace it.")

let config
if (fromEnvironment) {
  if (!process.env.ZAATI_INSTANCE_CONFIG_JSON) throw new Error("ZAATI_INSTANCE_CONFIG_JSON is required with --from-env.")
  config = JSON.parse(process.env.ZAATI_INSTANCE_CONFIG_JSON)
} else if (!process.stdin.isTTY) {
  const defaults = JSON.parse(await readFile(templatePath, "utf8"))
  await writeFile(target, `${JSON.stringify({ ...defaults, experience: { mode: "private", show_tour: false } }, null, 2)}\n`, {
    mode: 0o600,
  })
  await chmod(target, 0o600)
  console.log("Created an ignored private-workspace config. Demo content and guides are disabled.")
  process.exit(0)
} else {
  const defaults = JSON.parse(await readFile(templatePath, "utf8"))
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (label, fallback) => (await prompt.question(`${label} (${fallback}): `)).trim() || fallback
  config = {
    ...defaults,
    experience: { mode: "private", show_tour: false },
    brand_name: await ask("Dashboard name", defaults.brand_name),
    brand_mark: await ask("Short brand mark", defaults.brand_mark),
    tagline: await ask("Short tagline", defaults.tagline),
    timezone: await ask("IANA timezone", defaults.timezone),
    locale: await ask("Locale", defaults.locale),
    currency: await ask("Default ISO currency", defaults.currency),
    theme: {
      ...defaults.theme,
      preset: await ask("Palette: sage, ocean, plum, sand", defaults.theme.preset),
      default_mode: await ask("Mode: system, light, dark", defaults.theme.default_mode),
      density: await ask("Density: comfortable, compact", defaults.theme.density),
      font_family: await ask("Font: system, humanist, editorial, rounded, mono", defaults.theme.font_family),
      heading_style: await ask("Headers: plain, compact, expressive", defaults.theme.heading_style),
    },
  }
  prompt.close()
}
await writeFile(target, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
console.log("Created ignored config/instance.local.json. Run npm run data:validate next.")
