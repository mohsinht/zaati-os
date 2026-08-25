# Add a domain

## Scaffold the source

```bash
npm run source:add -- \
  --domain habits \
  --source daily \
  --label "Daily habits" \
  --description "Small habit signals and streaks" \
  --authorized-inputs "User-approved habit check-ins" \
  --forbidden-inputs "Medical diagnoses, private journal text" \
  --workflow daily-core
```

The generator adds a catalog entry, a provider-neutral prompt, a dedicated strict facts schema, and a deterministic owned path.

## Complete the pack

1. Review purpose, authorized inputs, forbidden inputs, cadence, freshness, role, and dependencies.
2. Replace the scaffolded `facts.records` fields with stable domain names where the source has a clearer durable model. Keep presentation derived from facts.
3. Add a synthetic example at `data/examples/<domain>/<source>/2026-08-24.json`.
4. Demonstrate one success state and one meaningful stale, partial, failed, or empty state.
5. Add the source ID to `config/instance.example.json` only when it belongs in the default experience.
6. Add the source ID to a `config/workflows.json` bundle only when it should share that workflow's cadence and publication transaction.
7. Run `npm run check`.
8. Document setup, permissions, disabling, and removal.

## When to add a block kind

Prefer composing an existing block. A new block is justified only when it enables a materially different interaction. It requires a schema version decision, strict size and URL constraints, a TypeScript type, safe renderer, accessibility behavior, light and dark styles, mobile review, synthetic fixture, tests, and LLM guidance.
