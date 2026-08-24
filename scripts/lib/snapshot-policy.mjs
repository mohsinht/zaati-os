import { scanSnapshot } from "./snapshot-safety.mjs"

const privacyRank = { public: 0, private: 1, sensitive: 2 }
const unsafeKey =
  /(?:^|[_-])(password|passwd|secret|cookie|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|private[_-]?key)(?:$|[_-])/i
const unsafeText = /<script\b|javascript:|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i
const CLOCK_SKEW_MS = 5 * 60 * 1000
const BUNDLE_DRIFT_MS = 60 * 60 * 1000

function walk(value, visit, trail = []) {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, visit, [...trail, index]))
  if (!value || typeof value !== "object") return
  for (const [key, child] of Object.entries(value)) {
    visit(key, child, [...trail, key])
    walk(child, visit, [...trail, key])
  }
}

function timestamp(value) {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isIanaTimezone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

function localDate(value, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value))
  const part = (type) => parts.find((item) => item.type === type)?.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

export function validateSnapshotPolicy(snapshot, registration, { allowSynthetic = false, bundleGeneratedAt, expectedDate } = {}) {
  const errors = scanSnapshot(snapshot, { contentGuards: registration.privacy.content_guards || [] })
  const generated = timestamp(snapshot.generated_at)
  const periodStart = timestamp(snapshot.effective_period?.start)
  const periodEnd = timestamp(snapshot.effective_period?.end)
  const expires = timestamp(snapshot.freshness?.expires_at)
  const bundleGenerated = timestamp(bundleGeneratedAt)
  const timezone = snapshot.effective_period?.timezone
  const snapshotDate = snapshot.snapshot_id?.slice(-10)

  if (!allowSynthetic && snapshot.privacy?.synthetic) errors.push("#/privacy/synthetic: real publication paths cannot claim synthetic data")
  if (
    !snapshot.privacy?.synthetic &&
    (privacyRank[snapshot.privacy?.classification] ?? -1) < privacyRank[registration.privacy.expected_classification]
  )
    errors.push(`#/privacy/classification: must be at least ${registration.privacy.expected_classification}`)
  if (periodStart !== null && periodEnd !== null && periodStart > periodEnd) errors.push("#/effective_period: start must not be after end")
  if (!isIanaTimezone(timezone)) errors.push("#/effective_period/timezone: must be a valid IANA timezone")
  if (generated !== null && expires !== null) {
    if (generated >= expires) errors.push("#/freshness/expires_at: must be after generated_at")
    const maximumExpiry = generated + registration.freshness_sla_hours * 60 * 60 * 1000 + CLOCK_SKEW_MS
    if (expires > maximumExpiry) errors.push(`#/freshness/expires_at: exceeds the ${registration.freshness_sla_hours}-hour source SLA`)
  }
  if (bundleGenerated !== null && generated !== null && Math.abs(generated - bundleGenerated) > BUNDLE_DRIFT_MS)
    errors.push("#/generated_at: must be within 60 minutes of the bundle generation time")
  if (generated !== null) {
    for (const [index, source] of (snapshot.sources || []).entries()) {
      const asOf = timestamp(source.as_of)
      if (asOf !== null && asOf > generated + CLOCK_SKEW_MS) errors.push(`#/sources/${index}/as_of: cannot be later than generated_at`)
    }
  }
  if (generated !== null && periodEnd !== null) {
    const dateTimezone = timezone && isIanaTimezone(timezone) ? timezone : "UTC"
    const generatedDate = localDate(generated, dateTimezone)
    const endDate = localDate(periodEnd, dateTimezone)
    if (snapshotDate !== generatedDate || snapshotDate !== endDate)
      errors.push("#/snapshot_id: date must match generated_at and effective-period end in the declared timezone")
  }
  if (expectedDate && snapshotDate !== expectedDate) errors.push(`#/snapshot_id: date must match path date ${expectedDate}`)
  if (snapshot.status !== "success" && !snapshot.quality?.warnings?.length)
    errors.push("#/quality/warnings: partial or failed snapshots require a warning")
  for (const dependency of registration.depends_on || []) {
    if (!snapshot.sources?.some((source) => source.reference === dependency || source.reference?.startsWith(`${dependency}:`)))
      errors.push(`#/sources: aggregate must record dependency ${dependency}`)
  }
  const blockIds = snapshot.data?.presentation?.blocks?.map((block) => block.id) || []
  if (new Set(blockIds).size !== blockIds.length) errors.push("#/data/presentation/blocks: block IDs must be unique")
  for (const [blockIndex, block] of (snapshot.data?.presentation?.blocks || []).entries()) {
    const blockPath = `#/data/presentation/blocks/${blockIndex}`
    if (block.kind === "line-chart") {
      const seriesKeys = block.series.map((series) => series.key)
      if (new Set(seriesKeys).size !== seriesKeys.length) errors.push(`${blockPath}/series: series keys must be unique`)
      const xLabels = block.points.map((point) => point.x)
      if (new Set(xLabels).size !== xLabels.length) errors.push(`${blockPath}/points: x labels must be unique`)
      for (const [pointIndex, point] of block.points.entries()) {
        const valueKeys = Object.keys(point.values).sort()
        const expectedKeys = [...seriesKeys].sort()
        if (valueKeys.length !== expectedKeys.length || valueKeys.some((key, index) => key !== expectedKeys[index]))
          errors.push(`${blockPath}/points/${pointIndex}/values: keys must exactly match the declared series keys`)
      }
    }
    if (block.kind === "table") {
      const columnKeys = block.columns.map((column) => column.key)
      if (new Set(columnKeys).size !== columnKeys.length) errors.push(`${blockPath}/columns: column keys must be unique`)
    }
  }
  walk(snapshot, (key, value, trail) => {
    if (unsafeKey.test(key)) errors.push(`#/${trail.join("/")}: secret-shaped keys are forbidden`)
    if (typeof value === "string" && unsafeText.test(value))
      errors.push(`#/${trail.join("/")}: executable or private-key text is forbidden`)
  })
  return errors
}
