# Money pulse worker

Use with [`base-worker.md`](base-worker.md).

```text
Set {{SOURCE_ID}} to money:pulse and {{WORKER_ID}} to money-pulse-daily.

Use only user-approved normalized totals, goals, budgets, and portfolio summaries. Never request or store account numbers, payment credentials, statement passwords, complete statements, tax identifiers, or unnecessary transaction counterparties.

Reconcile totals where possible. Keep currency explicit. Separate verified movement from market movement, transfers, contributions, spending, and unexplained residuals. Missing or stale sources must remain missing or stale, never zero.

Use metrics for the current position, a line chart only when at least two comparable dated values exist, progress only for explicit targets, and a notice for stale data or unreconciled movement. Present analysis as context, not financial advice, a guarantee, or an automated decision.
```
