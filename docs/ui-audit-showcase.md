# UI audit: template dashboard showcase

Historical audit. See the newer [cohesion review](ui-audit-cohesion.md) for the current visual direction.

Reviewed September 5–6, 2026. Scope: `zaati-os` only. No private dashboard, source snapshot store, scheduled task, or deployment configuration was changed.

## Intent

A reader should find the leading answer, understand its evidence, and identify a concrete next step. Visual contrast and motion support that sequence. Examples must be useful to a new forker without personal knowledge or new renderer code.

## Findings and implementation

| Finding                                                      | Resolution                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Metrics had nearly the same weight as labels                 | Larger tabular values, primary-color leading metric, semantic accent edges and tinted supporting tiles                     |
| New tinted tiles initially reduced label contrast            | Full-contrast tile labels; verified in the browser before capture                                                          |
| Static cards lifted on hover as if clickable                 | Removed lift while preserving quiet border feedback                                                                        |
| Line entrance stretched the measured geometry                | Clip reveal keeps points in their correct coordinates throughout motion                                                    |
| Bar hover moved measured endpoints                           | Removed positional scaling; highlight changes emphasis only                                                                |
| Narrow SVG charts shrank tick labels excessively             | Minimum 480px chart canvas, keyboard-focusable contained scroll region                                                     |
| Exact-value tables were screen-reader-only                   | Native `View data` disclosure exposes formatted evidence to everyone                                                       |
| Donut layout responded to viewport, not card width           | Container query switches to horizontal composition only when the card has space                                            |
| Donut legend did not have persistent touch selection         | Click/tap toggle and native keyboard activation, separate selected and inspected state                                     |
| Large donut totals and long labels could collide             | Compact center value, full legend values, wrapped category names                                                           |
| Example rows left gaps or squeezed tables                    | Revised spans and reading order; full-width holdings/work tables and wider source evidence                                 |
| Work distribution made the neighboring list excessively tall | Wide donut with side-by-side legend, narrow action list                                                                    |
| Headline metrics lacked supporting example evidence          | Removed unsupported goal-pace, monthly-change, and due-count headlines in showcase fixtures                                |
| Daily schedule contradicted its buffer and reply windows     | Buffer starts at 15:30; urgent reply is scheduled before the protected 08:30 focus window                                  |
| Screenshots could race lazy loading and animations           | Wait for page readiness, chart resolution, and animation completion                                                        |
| Historical demo screenshots looked entirely expired          | Review clock pinned to the latest synthetic snapshot; actual stale-source warnings remain                                  |
| Public captures lacked an explicit synthetic-only guard      | Screenshot capture rejects datasets not marked entirely synthetic                                                          |
| Forkers lacked isolated populated examples                   | Three complete envelopes under `/examples`, explicit local runner, schema/privacy validation and isolation regression test |

## Verification protocol

The full default-page pass also caught low contrast on a negative change in Weekly review. Change values now use readable neutral text, since a negative number alone does not imply a bad outcome. The money showcase reconciles total cash runway to the monthly living budget (22,600 / 3,100 = 7.3 months), and separately measures the emergency reserve (15,800 / 3,100 = 5.1 months).

The production build is exercised in local Chromium at 320, 390, 768, 1024, and 1440 CSS pixels, in light and dark modes. The showcase covers onboarding, component lab, daily, money, and work views. The normal build additionally covers agenda, inbox, news, and review. Automated checks include axe WCAG A/AA rules, document overflow, chart disclosure, selection toggling, keyboard Space activation, reduced-motion CSS, mobile navigation, theme studio, and prompt drawer. The component catalog is also checked with ocean, plum, and sand palettes in both themes.

Full-page PNGs in [examples/screenshots](../examples/screenshots) are rendered from synthetic envelopes with the production components. Visual inspection covers hierarchy, wrapping, chart legibility, card balance, source dates, and meaningful next actions. The examples use the default sage palette; alternative palettes remain user-selectable.

The repository gate is `npm run check`: formatting, lint, repository rules, schema and privacy validation, production build, coverage, tutorial, performance budgets, and browser accessibility. The separate showcase capture command is documented in [examples/README.md](../examples/README.md).

## Practical limits

The full repository check passed with 53 tests. Coverage was 97.57% lines, 86.68% branches, and 94.81% functions. The normal demo build measured 111 KB JavaScript, 10 KB CSS, and 87 KB dashboard data, all gzip and within the existing budgets. Screenshot evidence includes desktop and mobile, light and dark, for all three examples.

This audit uses Chromium emulation and browser automation, not a physical-device lab or a human screen-reader session. Axe is a baseline, not accessibility certification. At narrow widths, charts and wide tables intentionally scroll within their cards; the page itself must not overflow. Financial values are illustrative and formatted/rounded for display. No live account data or remote connector was used.

The public template's security and snapshot boundary is unchanged. These improvements add no chart library, external font, telemetry, or arbitrary snapshot-controlled markup. Design decisions and adaptation rules are maintained in the [design system](design-system.md).
