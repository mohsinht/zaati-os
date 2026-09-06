import { spawnSync, spawn } from "node:child_process"
import process from "node:process"

const env = { ...process.env, ZAATI_EXAMPLES: "true" }
const build = spawnSync(process.execPath, ["scripts/build-data-index.mjs"], { env, stdio: "inherit" })
if (build.status !== 0) process.exit(build.status || 1)
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
})
server.on("exit", (code) => process.exit(code || 0))
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal))
