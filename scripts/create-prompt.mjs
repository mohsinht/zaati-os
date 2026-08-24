#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import readline from "node:readline/promises"
import { generatePromptArtifacts, loadPromptContracts, normalizeGitHubRepository, writePromptArtifacts } from "./lib/prompt-studio.mjs"
import { detectedDefaults, expandDependencies } from "./lib/setup-options.mjs"

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

const providerTools = {
  chatgpt: ["Connected source selected in ChatGPT", "GitHub"],
  claude: ["Connected source selected in Claude", "GitHub"],
  gemini: ["Connected source selected in Gemini", "GitHub"],
  local: ["User-approved local connector", "GitHub"],
  custom: ["User-approved connector", "GitHub"],
}

async function interactiveProfile(contracts) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Interactive mode needs a terminal. Use --config for automation.")
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const defaults = detectedDefaults()
    const choose = async (question, options, fallback = 1) => {
      options.forEach((option, index) => console.log(`  ${index + 1}. ${option}`))
      const answer = (await rl.question(`${question} [${fallback}]: `)).trim() || String(fallback)
      const index = Number(answer) - 1
      if (!Number.isInteger(index) || !options[index]) throw new Error(`Choose a number from 1 to ${options.length}.`)
      return index
    }

    console.log("\nZaati OS Prompt Studio\nThree small choices. No credentials or private source values belong here.\n")
    const providerNames = ["ChatGPT", "Claude", "Gemini", "Local model", "Another workflow"]
    const providerIds = ["chatgpt", "claude", "gemini", "local", "custom"]
    console.log("1 of 3, choose where the task will run")
    const provider = providerIds[await choose("Provider", providerNames)]

    console.log("\n2 of 3, choose what the task should prepare")
    const pack = await choose("Starter", [
      "Daily dashboard (recommended)",
      "Essential agenda and work",
      "Weekly review",
      "Choose individual sources",
    ])
    let requestedIds
    if (pack === 0) requestedIds = ["overview:daily"]
    else if (pack === 1) requestedIds = ["agenda:primary", "work:focus"]
    else if (pack === 2) requestedIds = ["review:weekly"]
    else {
      contracts.registry.sources.forEach((source, index) => console.log(`  ${index + 1}. ${source.label}: ${source.description}`))
      const selected = splitList(await rl.question("Source numbers, comma separated: ")).map(Number)
      if (!selected.length || selected.some((number) => !Number.isInteger(number) || !contracts.registry.sources[number - 1]))
        throw new Error(`Choose source numbers from 1 to ${contracts.registry.sources.length}.`)
      requestedIds = selected.map((number) => contracts.registry.sources[number - 1].id)
    }
    const sourceIds = expandDependencies(requestedIds, contracts.registry)
    console.log(`  Zaati will publish ${sourceIds.length} complete snapshot${sourceIds.length === 1 ? "" : "s"} together.`)

    console.log("\n3 of 3, point it at your repositories")
    const codeRepository = normalizeGitHubRepository(await rl.question("Public Zaati OS fork (owner/repository): "))
    const dataRepository = normalizeGitHubRepository(await rl.question("Private data repository (owner/repository): "))
    const taskName = (await rl.question("Task name [Daily Zaati update]: ")).trim() || "Daily Zaati update"
    const schedule = (await rl.question("When should it run? [Every day at 07:00]: ")).trim() || "Every day at 07:00"
    const timezone = (await rl.question(`Timezone [${defaults.timezone}]: `)).trim() || defaults.timezone
    const outcome = (await rl.question("Anything special you want? [A calm, useful summary]: ")).trim() || "A calm, useful summary"
    const sources = sourceIds.map((id) => {
      const registration = contracts.registry.sources.find((source) => source.id === id)
      return {
        id,
        requirements: [registration.description, outcome],
        tools: providerTools[provider],
        preferred_blocks: registration.presentation.preferred_blocks,
      }
    })
    return {
      profile_version: "0.1.1",
      task_name: taskName,
      code_repository: codeRepository,
      data_repository: dataRepository,
      provider,
      timezone,
      schedule,
      publication: "pull-request",
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
  console.log(`\nReview ${artifacts.slug}.permissions.md first. It is the human-readable permission receipt.`)
  if (artifacts.missing.length) console.log("Merge the source-setup prompt's pull request before creating the scheduled task.")
  else console.log("Then copy the scheduled-task prompt into your LLM and approve only the listed connections.")
  if (has("--stdout")) console.log(`\n${artifacts.files[`${artifacts.slug}.scheduled-task.md`]}`)
} catch (error) {
  console.error(`Prompt Studio stopped: ${error.message}`)
  process.exitCode = 1
}
