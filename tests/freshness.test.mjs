import assert from "node:assert/strict"
import test from "node:test"
import { snapshotFreshness } from "../scripts/lib/freshness.mjs"

const hour = 60 * 60 * 1000
const now = Date.parse("2026-08-24T12:00:00Z")
const snapshot = (overrides = {}) => ({
  generated_at: new Date(now - hour).toISOString(),
  freshness: { expires_at: new Date(now + 5 * hour).toISOString() },
  status: "success",
  ...overrides,
})

test("freshness reflects expiry even when a snapshot claims success", () => {
  assert.equal(snapshotFreshness(snapshot(), now), "fresh")
  assert.equal(snapshotFreshness(snapshot({ freshness: { expires_at: new Date(now - 1).toISOString() } }), now), "stale")
  assert.equal(snapshotFreshness(snapshot({ status: "partial" }), now), "partial")
  assert.equal(snapshotFreshness(snapshot({ status: "failed" }), now), "failed")
  assert.equal(snapshotFreshness(undefined, now), "missing")
})

test("freshness warns when an otherwise healthy snapshot approaches expiry", () => {
  const aging = snapshot({ freshness: { expires_at: new Date(now + 20 * 60 * 1000).toISOString() } })
  assert.equal(snapshotFreshness(aging, now), "aging")
})
