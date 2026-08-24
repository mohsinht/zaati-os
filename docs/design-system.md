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

## Components

Owned shadcn-compatible primitives live under `src/components/ui/`. Domain rendering goes through `BlockRenderer`. Add a primitive only when an existing one cannot express the interaction cleanly.

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
