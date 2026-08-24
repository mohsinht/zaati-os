function contrastRatio(first, second) {
  const luminance = (hex) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)
      .map((value) => Number.parseInt(value, 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

export function validateCustomTheme(instance, file = "instance") {
  if (instance.theme?.preset !== "custom") return []
  const issues = []
  for (const mode of ["light", "dark"]) {
    const tokens = instance.theme.custom_tokens?.[mode]
    if (!tokens) continue
    const checks = [
      ["foreground", "background", 4.5],
      ["card_foreground", "card", 4.5],
      ["primary_foreground", "primary", 4.5],
      ["accent_foreground", "accent", 4.5],
      ["sidebar_foreground", "sidebar", 4.5],
      ["border", "background", 3],
      ["chart_1", "background", 3],
      ["chart_2", "background", 3],
      ["chart_3", "background", 3],
    ]
    for (const [foreground, background, minimum] of checks) {
      if (contrastRatio(tokens[foreground], tokens[background]) < minimum)
        issues.push(`${file}#/theme/custom_tokens/${mode}: ${foreground} against ${background} must have at least ${minimum}:1 contrast`)
    }
  }
  return issues
}
