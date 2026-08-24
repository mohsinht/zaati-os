# Make the design yours

Open the Theme studio from the settings button in the dashboard header. Preview:

- light and dark modes
- sage, ocean, plum, sand, or custom palettes
- comfortable or compact density
- system, humanist, editorial, rounded, or mono local font stacks
- plain, compact, or expressive headings
- tight, soft, or round corners

Preview choices stay in local browser storage. To make them the deployment default, copy the values into ignored `config/instance.local.json` or the protected `ZAATI_INSTANCE_CONFIG_JSON` deployment secret.

Custom color tokens are allowlisted by `schemas/instance.schema.json`. This keeps snapshot producers away from CSS while still allowing owners to control background, foreground, cards, borders, sidebar, primary, accent, and chart colors.

Use local system font stacks by default. They avoid third-party font requests, reduce startup work, and remove another privacy dependency.
