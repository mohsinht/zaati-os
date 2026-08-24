import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"
import { assertValidBundle, loadContracts, persistBundle } from "./lib/bundle-contract.mjs"
import { createMockBundle } from "./lib/mock-provider.mjs"

function parseOptions(argv) {
  const separator = argv.indexOf("--")
  const flags = separator >= 0 ? argv.slice(0, separator) : argv
  const command = separator >= 0 ? argv.slice(separator + 1) : []
  const value = (name, fallback) => {
    const index = flags.indexOf(`--${name}`)
    return index >= 0 ? flags[index + 1] : fallback
  }
  const maxAttempts = value("max-attempts")
  return {
    adapter: value("adapter", "mock"),
    workflowId: value("workflow", "daily-core"),
    maxAttempts: maxAttempts === undefined ? undefined : Number(maxAttempts),
    mockFailures: Number(value("mock-failures", "0")),
    outputRoot: value("output-dir"),
    encrypt: flags.includes("--encrypt"),
    command,
  }
}

export function commandAdapter(command, prompt, timeoutMs = 120000) {
  if (!command.length) throw new Error("The command adapter requires an executable after --.")
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), { shell: false, stdio: ["pipe", "pipe", "pipe"], env: process.env })
    const output = []
    let bytes = 0
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
    }, timeoutMs)
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length
      if (bytes > 2_000_000) child.kill("SIGTERM")
      else output.push(chunk)
    })
    child.stderr.on("data", () => {})
    child.on("error", reject)
    child.on("close", (code) => {
      clearTimeout(timer)
      if (bytes > 2_000_000) reject(new Error("Provider output exceeded the 2 MB safety limit."))
      else if (timedOut) reject(new Error(`Provider command timed out after ${timeoutMs} ms.`))
      else if (code !== 0) reject(new Error(`Provider command exited with code ${code}.`))
      else resolve(Buffer.concat(output).toString("utf8"))
    })
    child.stdin.end(prompt)
  })
}

export async function executeWorkflow(options = {}) {
  const settings = { ...parseOptions([]), ...options }
  const root = process.cwd()
  const workflowRegistry = JSON.parse(await readFile(path.join(root, "config/workflows.json"), "utf8"))
  const workflow = workflowRegistry.workflows.find((item) => item.id === settings.workflowId)
  if (!workflow) throw new Error(`Unknown workflow ${settings.workflowId}.`)
  settings.maxAttempts ??= workflow.max_attempts
  if (!Number.isInteger(settings.maxAttempts) || settings.maxAttempts < 1 || settings.maxAttempts > 5)
    throw new Error("max-attempts must be between 1 and 5.")
  const instancePath = await readFile(path.join(root, "config/instance.local.json"), "utf8")
    .then(() => "config/instance.local.json")
    .catch(() => "config/instance.example.json")
  const instance = JSON.parse(await readFile(path.join(root, instancePath), "utf8"))
  const bundlePrompt = (await readFile(path.join(root, workflow.prompt), "utf8"))
    .replaceAll("{{SOURCE_IDS}}", workflow.source_ids.join(", "))
    .replaceAll("{{TIMEZONE}}", instance.timezone)
    .replaceAll("{{CODE_REPOSITORY}}", process.env.ZAATI_CODE_REPOSITORY || "the configured Zaati OS code repository")
    .replaceAll("{{DATA_REPOSITORY}}", process.env.ZAATI_DATA_REPOSITORY || "the configured private data repository")
  const contracts = await loadContracts(root)
  let feedback = ""
  for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
    const prompt = `${bundlePrompt}${feedback}`
    let raw
    try {
      raw =
        settings.adapter === "mock"
          ? await createMockBundle({ root, attempt, failAttempts: settings.mockFailures, sourceIds: workflow.source_ids })
          : await commandAdapter(settings.command, prompt)
      const bundle = JSON.parse(raw)
      await assertValidBundle(bundle, contracts, { expectedSourceIds: workflow.source_ids })
      const files = settings.outputRoot
        ? await persistBundle(bundle, {
            outputRoot: settings.outputRoot,
            encryption: settings.encrypt,
            contracts,
            expectedSourceIds: workflow.source_ids,
          })
        : []
      console.log(
        `Workflow succeeded on attempt ${attempt}. Validated ${bundle.snapshots.length} snapshots${files.length ? " and committed the local file transaction" : " in dry mode"}.`,
      )
      return { bundle, files, attempts: attempt }
    } catch (error) {
      const reasons = error.validationErrors || [error instanceof SyntaxError ? "Output was not exact JSON." : error.message]
      if (attempt === settings.maxAttempts)
        throw new Error(`Workflow failed after ${attempt} attempts. Last rejection: ${reasons.slice(0, 5).join("; ")}`, { cause: error })
      feedback = `\n\n## Machine validation feedback for retry ${attempt + 1}\nThe previous output was rejected. Return a complete replacement bundle, not a patch. Fix only these contract errors:\n${reasons
        .slice(0, 12)
        .map((item) => `- ${item}`)
        .join("\n")}\n`
      console.log(`Attempt ${attempt} rejected safely. Retrying without writing snapshots.`)
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--help")) {
    console.log(`Usage:
  npm run workflow:run -- --workflow daily-core --adapter mock --mock-failures 1 --output-dir .zaati/tutorial-snapshots
  npm run workflow:run -- --workflow daily-core --adapter command --output-dir data/snapshots -- your-llm-cli --json

The provider receives the prompt over stdin and must return one exact JSON bundle over stdout.`)
  } else {
    await executeWorkflow(parseOptions(process.argv.slice(2)))
  }
}
