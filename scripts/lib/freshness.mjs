export function snapshotFreshness(snapshot, now = Date.now()) {
  if (!snapshot) return "missing"
  if (snapshot.status === "failed") return "failed"
  const expiresAt = Date.parse(snapshot.freshness?.expires_at)
  if (!Number.isFinite(expiresAt) || now >= expiresAt) return "stale"
  if (snapshot.status === "partial") return "partial"
  const generatedAt = Date.parse(snapshot.generated_at)
  const lifetime = Number.isFinite(generatedAt) ? Math.max(expiresAt - generatedAt, 0) : 0
  const agingWindow = Math.min(4 * 60 * 60 * 1000, Math.max(30 * 60 * 1000, lifetime * 0.25))
  return now >= expiresAt - agingWindow ? "aging" : "fresh"
}
