# One scheduled task, many snapshots

Use one LLM run to refresh several sources and publish them in one private Git commit.

## 1. Pick a small bundle

Start with three sources:

- `agenda:primary`
- `work:focus`
- `overview:daily`

Add inbox, money, or news only when the workflow has the required approved tools. More sources do not grant broader permissions. Each registration keeps its own authorized and forbidden inputs.

## 2. Test manually

Give the workflow:

- `prompts/daily-bundle.md`
- `prompts/scheduled-github-bundle.md`
- the current source registry and schemas
- access to the separate private data repository
- only the source tools needed by the selected registrations

Replace every placeholder. Ask it to run once manually before scheduling. Official OpenAI documentation also recommends testing a scheduled-task prompt in a regular chat and reviewing the first runs before relying on the cadence: [Scheduled tasks](https://learn.chatgpt.com/docs/automations).

## 3. Verify the result

The workflow should create one commit containing every selected dated file. It must not persist the bundle wrapper.

Check that:

- each source appears exactly once
- each file uses its registered deterministic path
- the overview references its dependencies
- one invalid snapshot prevents the entire commit
- safe validation feedback triggers at most three complete attempts
- the run report contains no private facts

## 4. Schedule one task

Schedule the tested prompt daily in the user's timezone. ChatGPT scheduled tasks can use plugins and skills when those capabilities are available to the chat, as documented in [Scheduled tasks](https://learn.chatgpt.com/docs/automations).

One task now refreshes the whole daily surface. Weekly review can remain a second, lower-frequency task.
