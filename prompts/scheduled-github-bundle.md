# Scheduled GitHub bundle wrapper

Use this wrapper in ChatGPT or another scheduled LLM workflow that can read connected sources and make one GitHub commit.

```text
Run prompts/daily-bundle.md for the selected sources using their registered tools. Keep the complete bundle in working memory.

Before publishing, validate it against schemas/snapshot-bundle.schema.json, schemas/snapshot.schema.json, schemas/ui-blocks.schema.json, and every registered domain schema. Apply the three-attempt retry protocol from the bundle prompt.

When valid, discard the wrapper and create every dated snapshot file from bundle.snapshots in the private data repository. Create one commit containing all paths. Do not create one commit per source. Preserve existing unrelated files, never force-push, and retry from the latest head if another writer won the race.

Return only a safe run report containing the effective date, source IDs, snapshot statuses, warnings, validation result, and commit reference. Do not repeat private snapshot facts in chat.
```
