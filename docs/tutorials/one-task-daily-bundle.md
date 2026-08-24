# One scheduled task, many snapshots

Use one LLM run to refresh several sources and publish them in one private pull request.

## 1. Pick a small bundle

Start with three sources:

- `agenda:primary`
- `work:focus`
- `overview:daily`

Add inbox, money, or news only when the workflow has the required approved tools. More sources do not grant broader permissions. Each registration keeps its own authorized and forbidden inputs.

## 2. Install the independent gate

Run `npm run data-repository:init` for the private repository, commit the generated workflow and contract, then require `Validate Zaati snapshots` in branch protection. The producing LLM must not be able to change or bypass this check.

## 3. Test manually

Give the workflow:

- `prompts/daily-bundle.md`
- `prompts/scheduled-github-bundle.md`
- the current source registry and schemas
- access to the separate private data repository
- only the source tools needed by the selected registrations

Replace every placeholder. Ask it to run once manually before scheduling. Official OpenAI documentation also recommends testing a scheduled-task prompt in a regular chat and reviewing the first runs before relying on the cadence: [Scheduled tasks](https://learn.chatgpt.com/docs/automations).

## 4. Verify the result

The workflow should open one pull request containing every selected dated file. It must not persist the bundle wrapper or merge itself.

Check that:

- each source appears exactly once
- each file uses its registered deterministic path
- the overview references its dependencies
- one invalid snapshot prevents the pull request from passing validation
- safe validation feedback triggers at most three complete attempts
- the run report contains no private facts

## 5. Schedule one task

Schedule the tested prompt daily in the user's timezone. ChatGPT scheduled tasks can use connected tools, skills, and plugins available to that chat, as documented in [Scheduled tasks](https://learn.chatgpt.com/docs/automations). Availability still depends on the workspace and installed connections.

One task now refreshes the whole daily surface. Weekly review can remain a second, lower-frequency task.
