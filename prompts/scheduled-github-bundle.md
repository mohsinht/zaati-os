# Scheduled GitHub bundle wrapper

Use this wrapper in ChatGPT or another scheduled LLM workflow that can read connected sources and open one GitHub pull request.

```text
Run prompts/daily-bundle.md for the selected sources using their registered tools. Keep the complete bundle in working memory.

Before publishing, validate it against schemas/snapshot-bundle.schema.json, schemas/snapshot.schema.json, schemas/ui-blocks.schema.json, and every registered domain schema. Apply the three-attempt retry protocol from the bundle prompt.

When valid, discard the wrapper and create every dated snapshot file from bundle.snapshots in the private data repository. Open one pull request containing all paths. Do not create one pull request per source. Preserve existing unrelated files, never force-push, and retry from the latest head if another writer won the race. Never merge your own pull request. The independent Zaati OS validation workflow and repository branch protection are the publication gate.

Return only a safe run report containing the effective date, source IDs, snapshot statuses, warnings, validation result, and pull request reference. Do not repeat private snapshot facts in chat.
```
