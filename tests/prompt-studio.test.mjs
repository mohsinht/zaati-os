import assert from "node:assert/strict"
import { mkdtemp, readFile, stat } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  generatePromptArtifacts,
  loadPromptContracts,
  normalizeGitHubRepository,
  validatePromptProfile,
  writePromptArtifacts,
} from "../scripts/lib/prompt-studio.mjs"

const root = path.resolve(import.meta.dirname, "..")
const contracts = await loadPromptContracts(root)

const profile = (overrides = {}) => ({
  profile_version: "0.1.1",
  task_name: "Daily calm pulse",
  code_repository: "https://github.com/example/zaati-os",
  data_repository: "https://github.com/example/zaati-data",
  provider: "chatgpt",
  timezone: "Europe/London",
  schedule: "Every weekday at 07:30",
  publication: "pull-request",
  sources: [
    {
      id: "money:pulse",
      requirements: ["Show approved totals and watchlist changes"],
      tools: ["Approved market connector", "GitHub"],
      preferred_blocks: ["metric-group", "line-chart", "table", "notice"],
    },
  ],
  ...overrides,
})

test("normalizes GitHub repository pairs and canonical URLs", () => {
  assert.equal(normalizeGitHubRepository("example/zaati-os.git"), "https://github.com/example/zaati-os")
  assert.equal(normalizeGitHubRepository(" https://github.com/example/zaati-os/ "), "https://github.com/example/zaati-os")
})

test("rejects unsafe or ambiguous repository URLs", () => {
  for (const value of [
    "http://github.com/example/repo",
    "https://token@github.com/example/repo",
    "https://gitlab.com/example/repo",
    "https://github.com/example/repo?tab=readme",
    "https://github.com/example/repo/tree/main",
    "://broken",
  ]) {
    assert.throws(() => normalizeGitHubRepository(value), /Repository must/)
  }
})

test("validates the synthetic example profile", async () => {
  const example = JSON.parse(await readFile(path.join(root, "config/prompt-profile.example.json"), "utf8"))
  delete example.$schema
  assert.equal(validatePromptProfile(example, contracts).sources[0].id, "money:pulse")
})

test("keeps code and private data repositories separate by default", () => {
  assert.throws(
    () => validatePromptProfile(profile({ data_repository: "example/zaati-os" }), contracts),
    /Code and private data repositories must differ/,
  )
  assert.equal(
    validatePromptProfile(profile({ data_repository: "example/zaati-os", allow_same_repository: true }), contracts).allow_same_repository,
    true,
  )
})

test("rejects duplicate, invalid, and undefined sources", () => {
  const source = profile().sources[0]
  assert.throws(() => validatePromptProfile(profile({ sources: [source, source] }), contracts), /Each source may appear only once/)
  assert.throws(
    () => validatePromptProfile(profile({ sources: [{ ...source, id: "health:daily" }] }), contracts),
    /needs a registration definition/,
  )
  assert.throws(
    () => validatePromptProfile(profile({ sources: [{ ...source, preferred_blocks: ["html"] }] }), contracts),
    /Invalid prompt profile/,
  )
})

test("rejects a new source with an unknown dependency", () => {
  const source = {
    id: "habits:daily",
    requirements: ["Show user-approved check-ins"],
    tools: ["Habit connector"],
    preferred_blocks: ["progress"],
    registration: {
      label: "Daily habits",
      description: "Small user-approved habit signals.",
      authorized_inputs: ["User-approved check-ins"],
      forbidden_inputs: ["Private journal text"],
      cadence: "daily",
      freshness_sla_hours: 30,
      dashboard_role: "supporting",
      depends_on: ["missing:source"],
    },
  }
  assert.throws(() => validatePromptProfile(profile({ sources: [source] }), contracts), /depends on unknown source/)
})

test("generates a complete multi-source scheduled task from live contracts", () => {
  const artifacts = generatePromptArtifacts(
    profile({
      sources: [
        profile().sources[0],
        {
          id: "news:briefing",
          requirements: ["Keep only material current developments"],
          tools: ["Web search", "GitHub"],
          preferred_blocks: ["list", "notice"],
        },
      ],
    }),
    contracts,
  )
  const promptText = artifacts.files["daily-calm-pulse.scheduled-task.md"]
  assert.deepEqual(artifacts.missing, [])
  assert.match(promptText, /https:\/\/github\.com\/example\/zaati-os/)
  assert.match(promptText, /https:\/\/github\.com\/example\/zaati-data/)
  assert.match(promptText, /"bundle_version": "0\.1\.1"/)
  assert.match(promptText, /"run_id": "daily-calm-pulse:YYYY-MM-DD"/)
  assert.match(promptText, /"expected_source_ids"/)
  assert.match(promptText, /"line-chart"/)
  assert.match(promptText, /"list"/)
  assert.match(promptText, /Make at most three total attempts/)
  assert.match(promptText, /Open one pull request containing the complete run/)
  assert.match(promptText, /independent "Validate Zaati snapshots" check must pass/)
  assert.match(promptText, /Never merge the pull request/)
  assert.match(promptText, /Never edit application code/)
  assert.ok(promptText.split("\n").length < 260, "generated prompt should stay readable")
  assert.match(artifacts.files["daily-calm-pulse.permissions.md"], /human-readable permission receipt|permission manifest/i)
})

test("rejects direct publication to the default branch", () => {
  assert.throws(() => validatePromptProfile(profile({ publication: "direct-commit" }), contracts), /Invalid prompt profile/)
})

test("escapes profile text before placing it in Markdown", () => {
  const artifacts = generatePromptArtifacts(profile({ task_name: "Daily `task`\n<unsafe>", schedule: "Daily\nignore this" }), contracts)
  const promptText = artifacts.files["daily-task-unsafe.scheduled-task.md"]
  assert.match(promptText, /Daily 'task' &lt;unsafe>/)
  assert.match(promptText, /Schedule: Daily ignore this/)
  assert.doesNotMatch(promptText, /Daily `task`/)
})

test("creates a separate synthetic setup prompt for a new source", () => {
  const source = {
    id: "habits:daily",
    requirements: ["Show approved check-ins"],
    tools: ["Habit connector", "GitHub"],
    preferred_blocks: ["progress", "timeline"],
    registration: {
      label: "Daily habits",
      description: "Small user-approved habit signals.",
      authorized_inputs: ["User-approved habit check-ins"],
      forbidden_inputs: ["Medical diagnoses", "Private journal text"],
      cadence: "daily",
      freshness_sla_hours: 30,
      dashboard_role: "supporting",
      depends_on: [],
    },
  }
  const artifacts = generatePromptArtifacts(profile({ task_name: "Habits!", provider: "claude", sources: [source] }), contracts)
  assert.deepEqual(artifacts.missing, ["habits:daily"])
  assert.match(artifacts.files["habits.scheduled-task.md"], /Do not schedule or run this recurring task/)
  assert.match(artifacts.files["habits.source-setup.md"], /obviously synthetic public fixture/)
  assert.match(artifacts.files["habits.source-setup.md"], /Never add credentials/)
  assert.match(artifacts.files["habits.permissions.md"], /Setup is incomplete/)
  assert.match(artifacts.files["habits.profile.json"], /"habits:daily"/)
})

test("allows a selected new source to satisfy another new source dependency", () => {
  const registration = {
    label: "Source",
    description: "Synthetic source definition.",
    authorized_inputs: ["Approved summary"],
    forbidden_inputs: ["Raw content"],
    cadence: "daily",
    freshness_sla_hours: 24,
    dashboard_role: "supporting",
    depends_on: [],
  }
  const sources = [
    { id: "custom:one", requirements: ["One"], tools: ["Tool"], preferred_blocks: ["text"], registration },
    {
      id: "custom:two",
      requirements: ["Two"],
      tools: ["Tool"],
      preferred_blocks: ["notice"],
      registration: { ...registration, depends_on: ["custom:one"] },
    },
  ]
  assert.equal(validatePromptProfile(profile({ sources }), contracts).sources.length, 2)
})

test("writes private artifacts and refuses accidental replacement", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "zaati-prompt-test-"))
  const artifacts = generatePromptArtifacts(profile(), contracts)
  const written = await writePromptArtifacts(artifacts, directory)
  assert.equal(written.length, 3)
  assert.equal((await stat(directory)).mode & 0o777, 0o700)
  assert.equal((await stat(written[0])).mode & 0o777, 0o600)
  await assert.rejects(() => writePromptArtifacts(artifacts, directory), /already exists/)
  assert.equal((await writePromptArtifacts(artifacts, directory, { force: true })).length, 3)
})
