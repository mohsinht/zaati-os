# Dashboard examples

Three complete, synthetic dashboards rendered by the production shadcn-compatible components. These are starter compositions for forkers, not personal records or live feeds.

```sh
npm ci
npm run examples
```

Open the local Vite URL with one of these query strings:

| Dashboard      | URL query                                        | Reading order                                                         |
| -------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Daily cockpit  | `?view=overview%3Adaily&at=2026-08-24T07:35:00Z` | Available focus, attention pattern, today's schedule, next actions    |
| Money overview | `?view=money%3Apulse&at=2026-08-24T07:35:00Z`    | Tracked value, scenarios and allocation, monthly plan, exact holdings |
| Work focus     | `?view=work%3Afocus&at=2026-08-24T07:35:00Z`     | Work in progress, state distribution, next moves, delivery evidence   |

`at` fixes the review clock to the fixture date. Without it, historical examples correctly appear stale. Every screen retains source dates and uncertainty. Scenarios are illustrative, not predictions.

## Adapt an example

Complete envelopes live in `snapshots/{domain}/{source}/2026-08-24.json`. Keep the envelope and use the existing eleven block kinds. Change content, block order, spans, and instance theme before considering renderer changes. Keep a two-column chart next to a one-column supporting block; use full-width tables when text needs room. Put the most important metric first because it receives the high-contrast treatment.

Examples are validated by `npm run data:validate`, including public/synthetic privacy requirements. `npm run examples` explicitly ignores private snapshots and local instance configuration. It builds the shared ignored `public/data/dashboard-data.json`, so stop other local dev servers first. Run `npm run dev` or `npm run build` afterward to restore normal instance selection. Never set `ZAATI_EXAMPLES=true` in a personal production deployment.

No new block types, provider integration, remote fonts, or chart dependency are required. Locale, currency, time zone, density, and palette remain instance settings. Do not mix fixture currencies when adapting examples.

## Reproduce the screenshots

```sh
ZAATI_EXAMPLES=true npm run build
ZAATI_CAPTURE_SCREENSHOTS=true ZAATI_SCREENSHOT_DIR=examples/screenshots npm run accessibility:check
```

Install Chrome or set `CHROME_PATH`. Capture rejects non-synthetic datasets, waits for lazy charts and entrance animations, then audits five widths in both themes. PNGs are actual local Chromium renders, not mockups.

| Example | Desktop light                                | Desktop dark                               | Mobile                                      |
| ------- | -------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Daily   | [Light](screenshots/overview-1440-light.png) | [Dark](screenshots/overview-1440-dark.png) | [390px](screenshots/overview-390-light.png) |
| Money   | [Light](screenshots/money-1440-light.png)    | [Dark](screenshots/money-1440-dark.png)    | [390px](screenshots/money-390-light.png)    |
| Work    | [Light](screenshots/work-1440-light.png)     | [Dark](screenshots/work-1440-dark.png)     | [390px](screenshots/work-390-light.png)     |

See the [design system](../docs/design-system.md) and [UI audit](../docs/ui-audit-showcase.md).
