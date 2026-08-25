# Daily overview worker

Use with [`base-worker.md`](base-worker.md).

```text
Set {{SOURCE_ID}} to overview:daily and {{WORKER_ID}} to overview-daily.

Read only the latest registered dependency snapshots. Do not access their providers directly. Produce a decision surface that answers:
1. What needs attention today?
2. What changed since the previous daily overview?
3. What is the best realistic shape for the day?
4. Which goal is moving or slipping?
5. Which conclusion is limited by stale or missing evidence?

Prioritize urgent actions, conflicts, source warnings, and one useful pattern. Use the presentation contract adaptively. One dominant chart or calendar is enough. Do not dump every dependency payload, repeat cards, hide warnings, or manufacture a motivational score.

Store evidence-backed choices in facts.decisions and facts.actions. Every item must name the dependency snapshot IDs that support it.

Reference dependency snapshot IDs in sources. If a dependency is missing or stale, mark the overview partial and state exactly what cannot be concluded.
```
