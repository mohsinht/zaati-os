import { readFile, writeFile } from "node:fs/promises"
import process from "node:process"

const hostname = process.env.ZAATI_HOSTNAME?.trim().toLowerCase()
const workerName = process.env.ZAATI_WORKER_NAME?.trim().toLowerCase()
if (!hostname || !/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) throw new Error("ZAATI_HOSTNAME must be a valid custom hostname.")
if (!workerName || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(workerName)) throw new Error("ZAATI_WORKER_NAME must be a 3 to 63 character lowercase slug.")
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"))
config.name = workerName
config.routes = [{ pattern: hostname, custom_domain: true }]
await writeFile(".wrangler.generated.jsonc", `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
console.log("Created ignored Cloudflare deployment configuration for the configured custom hostname.")
