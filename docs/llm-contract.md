# LLM contract

The contract lets any capable workflow publish dashboard information without coupling Zaati OS to a model provider.

## Producer responsibilities

A producer must:

1. read the current source registration and schemas
2. use only authorized inputs
3. minimize and normalize source content
4. preserve missing data and uncertainty
5. write only its deterministic owned path
6. validate the envelope and domain payload
7. make same-day reruns idempotent
8. report the run without repeating sensitive values

## Multi-snapshot bundles

One workflow may publish several registered sources through `schemas/snapshot-bundle.schema.json`. The bundle contains snapshots, never file paths. Zaati OS derives every target from the source registry, rejects duplicate source IDs, validates all nested contracts, and persists nothing until the complete set passes.

Use `prompts/daily-bundle.md` for one daily LLM run. Build direct-source candidates before aggregates so an overview can depend on valid snapshots from the same run.

## Retry protocol

The orchestration layer should attempt a complete candidate at most three times. After a rejection, return only concise validation errors to the model and request a complete replacement, not a patch. Do not leak input facts in error logs. After the final failure, write nothing and preserve the previous successful snapshots.

## Presentation is a request, not code

The LLM chooses the information shape. The application keeps control of rendering, colors, accessibility, responsive behavior, links, and executable code.

| Block | Use it for | Do not use it for |
| --- | --- | --- |
| `metric-group` | A few current decision measures | A wall of arbitrary counts |
| `line-chart` | Ordered comparable trends | One point or unrelated categories |
| `bar-chart` | Categorical comparison | Time-series storytelling |
| `calendar` | Events with real dates or times | Untimed task lists |
| `table` | Exact repeated fields | Narrative or one record |
| `list` | Actions, ranked items, attention queue | Raw provider dumps |
| `progress` | Explicit target with known denominator | Vague motivation scores |
| `timeline` | Meaningful event sequence | Decorative daily diary |
| `notice` | One caveat, risk, or insight | Repeating normal content |
| `text` | Short analysis that loses meaning when structured | Executable Markdown or HTML |

## Safety limits

The schema rejects unknown properties and limits block, row, point, item, series, text, and URL sizes. Links require HTTPS. Snapshots cannot contain scripts, HTML execution, private-key blocks, or secret-shaped keys. The app never evaluates snapshot text.

## Versioning

`schema_version` tracks the common envelope. Each catalog entry points to its domain schema. Additive changes may remain compatible. Renaming or removing fields, changing meaning, or tightening a previously valid requirement needs a new schema version and migration documentation.

A producer must read the current default branch before every run. Do not rely on a copied schema from an old prompt.

## Minimal valid payload

```json
{
  "title": "A clear day",
  "summary": "One decision deserves attention.",
  "attention": "medium",
  "presentation": {
    "layout": "focus",
    "blocks": [
      {
        "id": "decision",
        "kind": "notice",
        "title": "Choose the review window",
        "body": "Two approved times remain available.",
        "tone": "warning",
        "span": "full"
      }
    ]
  }
}
```

Use [`prompts/base-worker.md`](../prompts/base-worker.md) as the operational contract.
