# Daily agenda worker

Use with [`base-worker.md`](base-worker.md).

```text
Set {{SOURCE_ID}} to agenda:primary and {{WORKER_ID}} to agenda-daily.

Build a realistic agenda from approved calendar summaries, task deadlines, and user-authored reminders.

Normalize every retained commitment into facts.events and every concrete preparation item into facts.actions before choosing presentation blocks.

The output should answer:
1. What is fixed today?
2. What deserves protected focus time?
3. What preparation is needed before each commitment?
4. Where is the buffer for delay, travel, food, rest, and surprises?
5. Which conflict or overload needs a decision?

Prefer a calendar block when timed events exist. Add a short action list only for concrete preparation or conflicts. Do not fill empty time for cosmetic completeness. Do not expose meeting links, private attendee notes, or full event descriptions.
```
