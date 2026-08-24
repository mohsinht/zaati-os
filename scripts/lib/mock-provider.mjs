import { readFile } from "node:fs/promises"
import path from "node:path"

const DAILY_SOURCES = ["agenda:primary", "inbox:attention", "work:focus", "money:pulse", "news:briefing", "overview:daily"]

export async function createMockBundle({ root = process.cwd(), attempt = 1, failAttempts = 0, sourceIds = DAILY_SOURCES } = {}) {
  if (attempt <= failAttempts) return JSON.stringify({ bundle_version: "0.1.1", run_id: "tutorial-needs-retry" })
  const snapshots = await Promise.all(
    sourceIds.map(async (sourceId) => {
      const file = path.join(root, "data/examples", sourceId.replace(":", "/"), "2026-08-24.json")
      return JSON.parse(await readFile(file, "utf8"))
    }),
  )
  return JSON.stringify({
    bundle_version: "0.1.1",
    run_id: "tutorial-daily-bundle-2026-08-24",
    generated_at: "2026-08-24T07:30:00Z",
    snapshots,
  })
}
