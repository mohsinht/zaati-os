const currencies = {
  AE: "AED",
  AU: "AUD",
  BE: "EUR",
  CA: "CAD",
  CH: "CHF",
  DE: "EUR",
  ES: "EUR",
  FR: "EUR",
  GB: "GBP",
  IE: "EUR",
  IN: "INR",
  IT: "EUR",
  JP: "JPY",
  NL: "EUR",
  NZ: "NZD",
  PK: "PKR",
  PT: "EUR",
  SG: "SGD",
  US: "USD",
}

export function detectedDefaults() {
  const resolved = new Intl.DateTimeFormat().resolvedOptions()
  const locale = resolved.locale || "en-US"
  let region
  try {
    region = new Intl.Locale(locale).maximize().region
  } catch {
    region = "US"
  }
  return { locale, timezone: resolved.timeZone || "Etc/UTC", currency: currencies[region] || "USD" }
}

export function validTimezone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export function validLocale(value) {
  try {
    return new Intl.Locale(value).toString() === value
  } catch {
    return false
  }
}

export function validCurrency(value) {
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: value }).format(1)
    return /^[A-Z]{3}$/.test(value)
  } catch {
    return false
  }
}

export function expandDependencies(sourceIds, registry) {
  const byId = new Map(registry.sources.map((source) => [source.id, source]))
  const expanded = new Set()
  const add = (sourceId) => {
    const source = byId.get(sourceId)
    if (!source) throw new Error(`Unknown source ${sourceId}.`)
    source.depends_on.forEach(add)
    expanded.add(sourceId)
  }
  sourceIds.forEach(add)
  return [...expanded]
}
