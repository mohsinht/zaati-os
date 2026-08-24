import { access, readFile } from "node:fs/promises"
import process from "node:process"

const errors = []
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"))
const headers = await readFile("public/_headers", "utf8").catch(() => "")
if (config.assets?.directory !== "./dist") errors.push("wrangler.jsonc must serve ./dist.")
if (config.assets?.not_found_handling !== "single-page-application") errors.push("wrangler.jsonc must use the SPA fallback.")
if (config.workers_dev !== false) errors.push("workers_dev must remain false.")
if (config.preview_urls !== false) errors.push("preview_urls must remain false.")
if (config.account_id || config.routes || config.route)
  errors.push("Account IDs and personal hostnames belong in generated deployment configuration, not the public base file.")
try {
  await access("public/_redirects")
  errors.push("public/_redirects must not exist because Wrangler owns SPA routing.")
} catch (error) {
  if (error.code !== "ENOENT") throw error
}
for (const requirement of [
  "Content-Security-Policy:",
  "frame-ancestors 'none'",
  "X-Content-Type-Options: nosniff",
  "X-Robots-Tag: noindex",
  "/data/*",
  "Cache-Control: private, no-store",
]) {
  if (!headers.includes(requirement)) errors.push(`public/_headers must include ${requirement}`)
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exit(1)
}
console.log("Validated the private Cloudflare static-assets deployment contract.")
