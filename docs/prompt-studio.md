# Prompt Studio

Prompt Studio turns a small, private local profile into a complete prompt that you can paste into ChatGPT, Claude, Gemini, a local model, or another scheduled workflow. The generated prompt includes repository locations, source intent, current Zaati OS contracts, safe presentation blocks, privacy boundaries, validation, retries, and atomic publication.

It does not connect to an LLM, install source connectors, or store credentials.

## Three steps

```bash
npm run prompt:create
```

1. Choose a provider and a useful starter dashboard.
2. Enter the public code fork and private data repository.
3. Review `<task>.permissions.md`, then copy `<task>.scheduled-task.md` into your LLM and approve only the listed connections.

The normal wizard chooses registered sources, dependencies, safe blocks, and sensible tool labels for you. Repository names are the only technical concepts in the default path. Use a JSON profile when you need per-source control.

The profile and prompts are ignored by Git. Their directory uses mode `0700` and each file uses mode `0600`. They may still reveal repository names and workflow intent, so treat them as private configuration.

## Generate from a reusable profile

Start with the synthetic example:

```bash
cp config/prompt-profile.example.json .zaati/market-pulse.json
npm run prompt:create -- --config .zaati/market-pulse.json
```

Use separate repositories by default:

- `code_repository` is the public Zaati OS fork that defines schemas, prompts, and renderers.
- `data_repository` is the private repository that receives real snapshots.

The CLI rejects a shared code and data repository unless `allow_same_repository` is explicitly enabled. A public fork should never receive private snapshots.

## Profile contract

`schemas/prompt-profile.schema.json` is the executable contract. Each source needs:

- a registered `domain:source` ID
- decision-oriented `requirements`
- the exact approved `tools` available to the scheduled LLM
- one or more `preferred_blocks` from the audited UI contract

The preferred block list is a safe menu, not a forced layout. The LLM should choose a line chart only for an ordered trend, a table for exact repeated fields, a calendar for timed events, and no visualization when plain text is clearer.

## One task, many snapshots

Add several source objects to the same profile. The generated prompt includes `expected_source_ids`, requires one complete `snapshot-bundle`, retries the whole candidate at most three times, and opens one pull request. It never publishes a subset or merges its own pull request.

The private repository must independently validate the candidate with `npm run data-repository:init`. This separates the LLM that reads and writes data from the policy gate that decides whether the candidate is mergeable.

Direct sources should appear before aggregate sources. Registered aggregate dependencies still apply.

## Adding a source that does not exist

The interactive wizard intentionally accepts only registered sources. For a new source, add a `registration` object to a config profile. Prompt Studio then creates:

- `<task>.source-setup.md`, a one-time coding prompt that opens a public, generic pull request with synthetic fixtures and tests
- `<task>.scheduled-task.md`, a recurring data-only prompt that refuses to run until the registration is merged

Keep these authorities separate. A scheduled task must never change application code, configuration, prompts, schemas, documentation, dependencies, or CI.

## Automation

```bash
npm run prompt:create -- \
  --config .zaati/my-task.json \
  --output-dir .zaati/generated-prompts \
  --force
```

Use `--stdout` only when you deliberately want the generated scheduled prompt in terminal output. By default, Prompt Studio prints paths rather than prompt contents to reduce accidental disclosure in logs.

## Before pasting

- Confirm the code URL points to the intended Zaati OS fork.
- Confirm the data URL points to a private repository.
- Give the LLM only the source and GitHub permissions it needs.
- Review provider retention and training settings.
- Keep Cloudflare Access in front of the deployed dashboard.
- Run once with synthetic or low-sensitivity data before enabling the schedule.
