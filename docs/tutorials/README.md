# Tutorials

Start with one complete loop. Add nuance only after the first dashboard works.

1. [One scheduled task, many snapshots](one-task-daily-bundle.md)
2. [Connect a command-based LLM](local-command-adapter.md)
3. [Turn on encrypted snapshot storage](encrypted-snapshots.md)
4. [Make the design yours](theme-studio.md)

For the credential-free guided demo, run `npm run tutorial`. The mock provider returns an invalid contract once on purpose, receives validation feedback, retries, and produces six synthetic snapshots. It is a tiny robot tripping over its shoelaces and then recovering professionally.

When you are ready to connect your own LLM, run `npm run prompt:create`. The [Prompt Studio guide](../prompt-studio.md) turns your repository URLs, source needs, tools, schedule, and preferred blocks into one copy-ready scheduled-task prompt.
