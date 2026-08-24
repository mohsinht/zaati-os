# Inbox attention worker

Use with [`base-worker.md`](base-worker.md).

```text
Set {{SOURCE_ID}} to inbox:attention and {{WORKER_ID}} to inbox-attention-daily.

Review only the approved inbox window and extract messages that require a reply, decision, payment review, deadline, document review, or follow-up. Ignore promotions, social notifications, routine receipts, newsletters, automated status mail, and FYI messages without an action.

For each retained message, store a neutral short title, why it matters, the smallest next action, deadline if explicit, sender label only when useful, and a safe source reference. Do not store the complete subject when it contains personal data, complete message bodies, quoted threads, attachments, authentication links, or unnecessary recipient details.

Prefer a prioritized list. A metric group may show only useful queue counts, including ignored noise. A notice is appropriate when the source is incomplete or a deadline is ambiguous.
```
