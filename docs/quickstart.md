# Quickstart

This guide takes a new user from fork to a working synthetic dashboard, then to one real multi-source workflow without placing personal data in the public fork.

## 1. Fork and run the demo

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/zaati-os.git
cd zaati-os
npm install
npm run setup
npm run tutorial
```

The guided setup covers name, timezone, starter sources, visual style, and optional encryption. The tutorial proves validation and retry behavior with synthetic data, then opens the app.

When the demo feels right, generate the complete prompt for your real scheduled LLM task:

```bash
npm run prompt:create
```

Choose sources, describe the result you need, name the approved tools, and select useful presentation blocks. Paste the private generated prompt into your LLM. Read [Prompt Studio](prompt-studio.md) for multi-source profiles and new-source setup.

## 2. Configure the instance

The wizard writes `config/instance.local.json`. It is ignored by Git. You can rerun it with `npm run setup -- --force`.

## 3. Choose a data boundary

For experimentation, write snapshots under ignored `data/snapshots/`.

For production, keep the public code fork clean and create a separate private data repository with the same `data/snapshots/<domain>/<source>/...` shape. Follow [Private data repository](deployment/data-repository.md).

## 4. Connect one multi-source workflow

A useful first set is:

- `agenda:primary`
- `inbox:attention`
- `work:focus`

Open `prompts/daily-bundle.md` and `prompts/scheduled-github-bundle.md`. Replace their repository, source, and timezone placeholders. Give them to the LLM workflow that already has approved access.

Run the complete prompt manually before scheduling it. One run should validate and commit all selected dated files together. For a command adapter, pipe exact JSON into the local transaction:

```bash
your-llm-command | npm run snapshot:ingest -- --output-dir data/snapshots
```

## 5. Add the overview in the same bundle

Build non-aggregate snapshots first in memory. The overview can then use those validated candidates in the same run and commit.

## 6. Deploy privately

First deploy synthetic data to a custom Cloudflare hostname. Configure an exact Access Allow policy, verify the unauthenticated challenge, then connect the private data repository and enable production deployment.

Do not use public Pages, `workers.dev`, preview URLs, or obscurity for real snapshots. Follow [Cloudflare deployment](deployment/cloudflare.md).
