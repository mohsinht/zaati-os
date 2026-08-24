# Connect a command-based LLM

Zaati OS can drive any local or hosted LLM command without importing its SDK.

## Adapter contract

The executable receives `prompts/daily-bundle.md` over standard input. It must return one exact bundle JSON object over standard output. Logs may use standard error, but should never contain private source values.

```bash
npm run workflow:run -- \
  --adapter command \
  --max-attempts 3 \
  --output-dir data/snapshots \
  -- your-llm-cli --json
```

Zaati OS launches the command without a shell, caps output at 2 MB, applies a two-minute timeout, validates the whole result, returns concise errors for bounded retries, and writes only a fully valid bundle.

## Prove the behavior without credentials

```bash
npm run workflow:run -- \
  --adapter mock \
  --mock-failures 2 \
  --max-attempts 3 \
  --output-dir .zaati/tutorial-snapshots
```

The first two outputs are invalid. The third passes and writes six synthetic snapshots together.

## Pipe an existing workflow

If another tool already produces the bundle, skip the adapter runner:

```bash
your-flow | npm run snapshot:ingest -- --output-dir data/snapshots
```

Use `--dry-run` before the first real write.
