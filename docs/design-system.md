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

Complexity should come from hierarchy, not ornament. Use `dashboard` for a dominant view plus supporting evidence, `focus` for one leading decision, and `timeline` for a narrow sequence. A block may span one, two, or all dashboard columns. Do not simulate complexity with nested cards, arbitrary component trees, or repeated metrics.

## Components

Owned shadcn-compatible primitives live under `src/components/ui/`. Domain rendering goes through `BlockRenderer`. Add a primitive only when an existing one cannot express the interaction cleanly.

The synthetic **Component lab** is the executable catalog: validated JSON appears on the left and the production renderer appears on the right. A new block is not complete until it appears there through a public synthetic fixture, with schema, type, renderer, tests, privacy review, and documentation.

Charts are explorable rather than decorative. Line points and bars expose the same exact-value callout on pointer hover and keyboard focus. Donut legends act as controls that highlight the matching segment and update its center value. Supporting blocks use quiet hover feedback and brief entrance motion; interaction must never be required to recover a fact that is absent from the accessible table, list, or text equivalent.

Use semantic tokens such as `background`, `card`, `muted`, `primary`, `warning`, and chart tokens. Do not hardcode provider or source colors inside components.

## Accessibility

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
