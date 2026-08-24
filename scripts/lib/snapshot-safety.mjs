export const credentialPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{24,}\b/],
  ["OpenAI-style key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Bearer credential", /\bBearer\s+[A-Za-z0-9._~+/-]{24,}=*\b/i],
  ["JWT credential", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["live payment key", /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/],
  ["embedded credential", /\b(?:api[_ -]?key|client[_ -]?secret|password|access[_ -]?token)\s*[:=]\s*["']?[A-Za-z0-9._~-]{12,}/i],
  ["credential in URL", /https:\/\/[^\s/:]+:[^\s/@]{8,}@/i],
]

const guardChecks = {
  "account-number": (value) => /\b\d{8,18}\b/.test(value),
  "authentication-link": (value) =>
    /https:\/\/[^\s]+[?&](?:access_token|auth|code|key|otp|password|reset|secret|token)=[^\s&]{4,}/i.test(value),
  "one-time-code": (value) => /\b(?:otp|one[- ]time|verification|security)\s+(?:code\s+)?\d{4,8}\b/i.test(value),
  "raw-email": (value) => {
    const headers = ["from", "to", "subject", "date"].filter((name) => new RegExp(`(?:^|\\n)${name}:`, "i").test(value))
    return headers.length >= 3 && value.length > 180
  },
  "encoded-blob": (value) => value.length > 1000 && /^[A-Za-z0-9+/=\s]+$/.test(value),
}

function walk(value, visit, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, [...trail, index]))
    return
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") visit(value, trail)
    return
  }
  for (const [key, child] of Object.entries(value)) walk(child, visit, [...trail, key])
}

export function scanSnapshot(snapshot, { contentGuards = [] } = {}) {
  const errors = []
  walk(snapshot, (value, trail) => {
    const location = `#/${trail.join("/")}`
    for (const [label, pattern] of credentialPatterns) {
      if (pattern.test(value)) errors.push(`${location}: possible ${label} is forbidden`)
    }
    for (const name of contentGuards) {
      const check = guardChecks[name]
      if (check?.(value)) errors.push(`${location}: ${name} content guard rejected the value`)
    }
  })
  return errors
}

export const supportedContentGuards = Object.keys(guardChecks)
