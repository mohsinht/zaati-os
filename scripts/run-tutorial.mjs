import { spawn } from "node:child_process"
import process from "node:process"
import { executeWorkflow } from "./run-workflow.mjs"

const outputRoot = ".zaati/tutorial-snapshots"
await executeWorkflow({ workflowId: "daily-core", adapter: "mock", mockFailures: 1, maxAttempts: 3, outputRoot, encrypt: false, command: [] })
const env = { ...process.env, ZAATI_DATA_DIR: outputRoot, ZAATI_TUTORIAL_MODE: "true" }
if (process.argv.includes("--check")) {
  const child = spawn(process.execPath, ["scripts/build-data-index.mjs"], { stdio: "inherit", env })
  const code = await new Promise((resolve) => child.on("close", resolve))
  if (code !== 0) process.exit(code)
  console.log("Tutorial check passed. The mock LLM recovered from invalid output and built six snapshots.")
} else {
  console.log("Opening the tutorial dashboard. The mock LLM deliberately stumbled once, recovered, and then said voila.")
  const child = spawn("npm", ["run", "dev", "--", "--open"], { stdio: "inherit", env, shell: process.platform === "win32" })
  process.on("SIGINT", () => child.kill("SIGINT"))
  process.exitCode = await new Promise((resolve) => child.on("close", resolve))
}
