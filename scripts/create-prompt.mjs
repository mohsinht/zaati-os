#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import readline from "node:readline/promises"
import { generatePromptArtifacts, loadPromptContracts, normalizeGitHubRepository, writePromptArtifacts } from "./lib/prompt-studio.mjs"

const args = process.argv.slice(2)
const valueFor = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
const has = (name) => args.includes(name)

function printHelp() {
  console.log(`Zaati OS Prompt Studio

Usage:
  npm run prompt:create
  npm run prompt:create -- --config config/prompt-profile.example.json

Options:
  --config <file>       Generate from a reusable profile
  --output-dir <path>  Default: .zaati/generated-prompts
  --stdout             Print the scheduled-task prompt after writing it
  --force              Replace files with the same generated names
  --help                Show this help

Generated prompts and profiles are private local files with mode 0600 and are ignored by Git.`)
}

const splitList = (answer) =>
  answer
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

async function interactiveProfile(contracts) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Interactive mode needs a terminal. Use --config for automation.")
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    console.log("\nZaati OS Prompt Studio\nAnswer a few questions. No credentials or source values belong here.\n")
    const sourceChoices = contracts.registry.sources.map((source) => source.id)
    console.log(`Registered sources: ${sourceChoices.join(", ")}`)
    const sourceIds = splitList(await rl.question("Source IDs, comma separated: "))
    const sources = []
    for (const id of sourceIds) {
      if (!sourceChoices.includes(id))
        throw new Error(`Interactive mode currently supports registered sources only. Add ${id} with npm run source:add, or use --config.`)
      sources.push({
        id,
        requirements: splitList(await rl.question(`What should ${id} contain? Comma separated: `)),
        tools: splitList(await rl.question(`Which approved tools can ${id} use? Comma separated: `)),
        preferred_blocks: splitList(await rl.question(`Preferred blocks for ${id} (for example line-chart, table, notice): `)),
      })
    }
    return {
      profile_version: "0.1.1",
      task_name: await rl.question("Task name: "),
      code_repository: normalizeGitHubRepository(await rl.question("Public Zaati OS fork (owner/repository): ")),
      data_repository: normalizeGitHubRepository(await rl.question("Private data repository (owner/repository): ")),
      provider: (await rl.question("Provider [chatgpt]: ")) || "chatgpt",
      timezone: (await rl.question("Timezone [Etc/UTC]: ")) || "Etc/UTC",
      schedule: await rl.question("Schedule in plain language: "),
      publication: (await rl.question("Publication [pull-request]: ")) || "pull-request",
      sources,
    }
  } finally {
    rl.close()
  }
}

if (has("--help")) {
  printHelp()
  process.exit(0)
}

try {
  const contracts = await loadPromptContracts()
  const configPath = valueFor("--config")
  const profile = configPath ? JSON.parse(await readFile(path.resolve(configPath), "utf8")) : await interactiveProfile(contracts)
  delete profile.$schema
  const artifacts = generatePromptArtifacts(profile, contracts)
  const outputDirectory = path.resolve(valueFor("--output-dir") || ".zaati/generated-prompts")
  const written = await writePromptArtifacts(artifacts, outputDirectory, { force: has("--force") })
  console.log(`\nCreated ${written.length} private local file${written.length === 1 ? "" : "s"}:`)
  written.forEach((file) => console.log(`- ${path.relative(process.cwd(), file)}`))
  if (artifacts.missing.length) console.log("\nMerge the source-setup prompt's pull request before creating the scheduled task.")
  else console.log("\nCopy the scheduled-task prompt into your LLM. Then approve its requested GitHub and source connections.")
  if (has("--stdout")) console.log(`\n${artifacts.files[`${artifacts.slug}.scheduled-task.md`]}`)
} catch (error) {
  console.error(`Prompt Studio stopped: ${error.message}`)
  process.exitCode = 1
}
