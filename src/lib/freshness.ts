import type { Snapshot } from "@/types"

export type FreshnessState = "fresh" | "aging" | "stale" | "partial" | "failed" | "missing"

export function snapshotFreshness(snapshot: Snapshot | null, now = Date.now()): FreshnessState {
  if (!snapshot) return "missing"
  if (snapshot.status === "failed") return "failed"
  const expiresAt = Date.parse(snapshot.freshness.expires_at)
  if (!Number.isFinite(expiresAt) || now >= expiresAt) return "stale"
  if (snapshot.status === "partial") return "partial"
  const generatedAt = Date.parse(snapshot.generated_at)
  const lifetime = Number.isFinite(generatedAt) ? Math.max(expiresAt - generatedAt, 0) : 0
  const agingWindow = Math.min(4 * 60 * 60 * 1000, Math.max(30 * 60 * 1000, lifetime * 0.25))
  return now >= expiresAt - agingWindow ? "aging" : "fresh"
}
