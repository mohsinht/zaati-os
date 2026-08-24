# Coding agent contract

Zaati OS is a public, reusable personal-data framework. Preserve both sides of that sentence: the upstream repository stays public and generic, while every real deployment stays private and user-owned.

## Before changing anything

1. Read `README.md`, `docs/architecture.md`, `docs/llm-contract.md`, `docs/privacy.md`, and `docs/design-system.md`.
2. Inspect `config/sources.json`, `schemas/snapshot.schema.json`, `schemas/ui-blocks.schema.json`, and the relevant domain schema.
3. Decide whether the change affects public code, a reusable source pack, an LLM ingestion run, or deployment infrastructure.

## Privacy boundary

- Never commit real snapshots, local instance configuration, generated dashboard data, credentials, provider exports, or identifying screenshots.
- Public examples must be obviously synthetic, use `privacy.synthetic: true`, use `classification: public`, and contain no personal data.
- Never move values from a private deployment into tests, fixtures, issue reports, screenshots, logs, or documentation.
- Never weaken `.gitignore`, privacy validation, worker ownership, or Access-first deployment to make a workflow easier.
- Do not add telemetry, analytics, hosted accounts, or an upstream data service without an explicit project-level decision.

## Snapshot ingestion

- One registered worker owns one deterministic `domain/source` path.
- Same-day reruns replace only today's owned file and preserve `snapshot_id`.
- Never invent missing values or convert unavailable facts to zero.
- Preserve provenance, freshness, status, confidence, warnings, and privacy.
- Aggregate workers may read only registered dependencies and must reference their snapshot IDs.
- A data-only worker never edits source code, schemas, prompts, configuration, generated files, or another worker path.

## LLM presentation contract

- LLMs choose from the audited block union in `schemas/ui-blocks.schema.json`.
- Never render arbitrary HTML, Markdown HTML, SVG, CSS, JavaScript, component names, template expressions, or executable links from a snapshot.
- New block kinds require a versioned schema change, TypeScript type, renderer, synthetic fixture, test, privacy review, and documentation.
- Choose visualization by meaning. Trends use lines, categories use bars, timed events use calendars, exact repeated fields use tables, and sequences use timelines.
- Missing or empty information needs an honest state, not decorative filler.

## Interface

- Follow shadcn composition and semantic theme tokens.
- Keep `components.json`, Tailwind v4, the `@/` alias, and `cn()` generator-compatible.
- Use owned primitives under `src/components/ui/` before introducing one-off controls.
- Avoid gradients, marketing heroes inside the authenticated dashboard, arbitrary bold text, repeated card grids, and low-value charts.
- Keep one dominant answer, quieter supporting detail, visible evidence warnings, source dates, mobile behavior, focus states, and reduced-motion support.
- Never hardcode personal figures, names, providers, currencies, timezones, or hostnames in React code.

## Deployment

- Keep `workers_dev` and `preview_urls` disabled.
- Keep account IDs, tokens, hostnames, private repository names, and instance JSON out of the repository.
- Generate deployment configuration from environment variables.
- Verify Cloudflare Access from an unauthenticated request before importing or deploying private snapshots.
- Never upload compiled private dashboard artifacts to public CI artifacts.

## Validation

Run `npm run check` before proposing a change. Interface changes also require visual review in light, dark, desktop, and mobile layouts. Update screenshots only from synthetic demo mode.
