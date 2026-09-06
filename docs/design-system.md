# Design system

Zaati OS is a decision interface, not a marketing dashboard.

## Visual language

- shadcn New York composition
- Tailwind v4 semantic variables
- flat surfaces, quiet borders, no gradients
- compact typography with strong hierarchy
- one dominant visualization with supporting rows, lists, and tables
- restrained status color used for meaning
- brief transitions that respect reduced motion

## Page anatomy

1. Source label and effective period
2. One plain-language answer
3. Short explanation
4. Visible freshness or evidence warning
5. Adaptive block grid
6. Provenance footer

Repeated facts belong in a table or row. Empty cards, decorative KPIs, arbitrary bold text, and chart-shaped wallpaper do not belong.

Long lists and tables disclose an initial decision-sized set, with the remaining validated content available on demand. Metric values wrap without truncation. Line charts use a data-relative domain so meaningful change stays visible; categorical bar charts retain a zero baseline.

Complexity should come from hierarchy, not ornament. Use `dashboard` for a dominant view plus supporting evidence, `focus` for one leading decision, and `timeline` for a narrow sequence. A block may span one, two, or all dashboard columns. Do not simulate complexity with nested cards, arbitrary component trees, or repeated metrics.

## Components

Owned shadcn-compatible primitives live under `src/components/ui/`. Domain rendering goes through `BlockRenderer`. Add a primitive only when an existing one cannot express the interaction cleanly.

The synthetic **Component lab** is the executable catalog: validated JSON appears on the left and the production renderer appears on the right. A new block is not complete until it appears there through a public synthetic fixture, with schema, type, renderer, tests, privacy review, and documentation.

Charts are explorable rather than decorative. Line points and bars expose the same exact-value callout on pointer hover and keyboard focus. Donut legends act as controls that highlight the matching segment and update its center value. Supporting blocks use quiet hover feedback and brief entrance motion; interaction must never be required to recover a fact that is absent from the accessible table, list, or text equivalent.

Use semantic tokens such as `background`, `card`, `muted`, `primary`, `warning`, and chart tokens. Do not hardcode provider or source colors inside components.

## Dashboard composition recipes

The [populated examples](../examples/README.md) are executable composition references. They use the production renderer and existing snapshot schema. Personal data never belongs in examples or screenshots.

| Element            | Rule                                                                                    | Reason                                               |
| ------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Primary metric     | First metric uses `primary` / `primary-foreground`; values use 24–32px tabular numerals | Establish one visual anchor without a marketing hero |
| Supporting metrics | Semantic accent edge, 9% tinted surface, full-contrast labels                           | Separate measures while preserving legibility        |
| Cartesian charts   | Two-column span preferred; 480px minimum canvas with contained horizontal scroll        | Keep tick labels readable at 320px                   |
| Donut              | Stack inside narrow cards; switch to side-by-side at a 480px container                  | Respond to the card rather than viewport width       |
| Exact values       | Native `View data` disclosure, formatted table; full donut legend values                | Make precision available to touch and keyboard users |
| Evidence           | Keep dates, stale status, and assumptions adjacent to the decision                      | Avoid implying live or complete data                 |
| Tables             | Prefer two columns or full width for prose-heavy rows                                   | Avoid unreadable evidence columns                    |

Categorical chart colors distinguish series, not good and bad. Line styles also differ so color is not the only encoding. A numeric increase is not automatically a favorable outcome; producers should supply a change only when its meaning is clear. Metric emphasis indicates priority, not health.

### Motion and interaction

Entrance motion runs once, with no perpetual pulsing or autoplay. Blocks settle over 320ms; line and progress reveals use a 520ms clip wipe so the data's geometry never stretches sideways; bars grow over 480ms. Chart interaction changes emphasis without moving the measured endpoint. Static cards remain in place on hover. Reduced-motion preference reduces animations and transitions to 0.01ms.

Donut legend buttons toggle persistent selection with click, tap, Enter, or Space. Hover and focus provide temporary inspection; `aria-pressed` describes selection only. Long category names wrap. The center uses compact notation; full values remain in the legend. Cartesian data is also available through a native disclosure, with no pointer precision required.

### References and boundaries

Composition research: [shadcn dashboard-01](https://ui.shadcn.com/blocks), [chart gallery](https://ui.shadcn.com/charts/area), and [chart documentation](https://ui.shadcn.com/docs/components/chart), reviewed September 5, 2026. Adopted the strong metric row, dominant visualization, contextual table, and progressive disclosure patterns. Zaati retains its owned shadcn-compatible primitives and lightweight SVG renderer; it does not add Recharts or copy reference code.

Palette changes belong in semantic tokens or validated instance themes. Snapshots select content, spans, and audited block kinds, never CSS, JavaScript, SVG, or arbitrary component trees. The showcase build is explicit and ignores local private configuration. Normal personal builds retain the existing behavior.

## Accessibility verification

All controls need accessible names, keyboard focus, usable touch targets, and sufficient contrast. Color cannot be the only status signal. Charts need an accessible label and should have table or narrative evidence in the snapshot when exact values matter.

Review every interface change at desktop and mobile widths in light and dark modes.

`npm run accessibility:check` runs axe against the production build in desktop light, desktop dark, and mobile layouts. It is a floor, not a substitute for keyboard, screen-reader, zoom, reduced-motion, and real-device review.

## Performance

- keep the dashboard payload separate from cached application JavaScript
- lazy-load charts and onboarding code
- use local system font stacks with no third-party requests
- keep navigation and empty states useful before charts load
- enforce compressed JavaScript, CSS, and data budgets with `npm run performance:check`

Responsiveness starts at 320 CSS pixels. Touch controls should be at least 40 pixels in the application shell and preserve a visible focus state.
