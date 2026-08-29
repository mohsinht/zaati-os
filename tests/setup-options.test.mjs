import assert from "node:assert/strict"
import test from "node:test"
import registry from "../config/sources.json" with { type: "json" }
import {
  detectedDefaults,
  expandDependencies,
  resolvedExperience,
  validCurrency,
  validLocale,
  validTimezone,
} from "../scripts/lib/setup-options.mjs"

test("detects usable local defaults", () => {
  const defaults = detectedDefaults()
  assert.equal(validLocale(defaults.locale), true)
  assert.equal(validTimezone(defaults.timezone), true)
  assert.equal(validCurrency(defaults.currency), true)
})

test("validates setup values instead of silently accepting mistakes", () => {
  assert.equal(validTimezone("Europe/London"), true)
  assert.equal(validTimezone("Mars/Olympus"), false)
  assert.equal(validLocale("en-GB"), true)
  assert.equal(validLocale("not a locale"), false)
  assert.equal(validCurrency("GBP"), true)
  assert.equal(validCurrency("pounds"), false)
})

test("expands aggregate source dependencies in deterministic order", () => {
  assert.deepEqual(expandDependencies(["overview:daily"], registry), [
    "agenda:primary",
    "inbox:attention",
    "work:focus",
    "money:pulse",
    "news:briefing",
    "overview:daily",
  ])
  assert.throws(() => expandDependencies(["missing:source"], registry), /Unknown source/)
})

test("local workspaces fail closed to private mode while the upstream example remains a demo", () => {
  assert.deepEqual(resolvedExperience({}, { hasLocalConfig: true }), { mode: "private", show_tour: false })
  assert.deepEqual(resolvedExperience({}, { hasLocalConfig: false }), { mode: "demo", show_tour: true })
  assert.deepEqual(resolvedExperience({ experience: { mode: "private", show_tour: false } }), {
    mode: "private",
    show_tour: false,
  })
  assert.deepEqual(resolvedExperience({}, { hasLocalConfig: true, demoOverride: true }), { mode: "demo", show_tour: true })
})
