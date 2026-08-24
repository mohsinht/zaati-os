# Quickstart

This guide takes a new user from fork to a local synthetic demo, then to three real sources without placing personal data in the public fork.

## 1. Fork and run the demo

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/zaati-os.git
cd zaati-os
npm install
npm run dev
```

The app uses `data/examples/` until at least one ignored private snapshot is available. Every example is synthetic and labeled in the interface.

## 2. Configure the instance

```bash
npm run instance:configure
npm run data:validate
```

The wizard writes `config/instance.local.json`. It is ignored by Git. Configure the label, tagline, IANA timezone, locale, ISO currency, palette, and enabled sources.

## 3. Choose a data boundary

For experimentation, write snapshots under ignored `data/snapshots/`.

For production, keep the public code fork clean and create a separate private data repository with the same `data/snapshots/<domain>/<source>/...` shape. Follow [Private data repository](deployment/data-repository.md).

## 4. Start with three sources

A useful first set is:

- `agenda:primary`
- `inbox:attention`
- `work:focus`

Open `prompts/base-worker.md` and the matching domain prompt. Replace the repository, worker, source, and timezone placeholders. Give the combined prompt to the LLM workflow that already has approved access.

Run each prompt manually before scheduling it. Validate the resulting snapshot:

```bash
npm run data:validate
npm run dev
```

## 5. Add the overview

After its registered dependencies exist, run `prompts/daily-overview.md`. It reads normalized snapshots only and becomes the main Today view.

## 6. Deploy privately

First deploy synthetic data to a custom Cloudflare hostname. Configure an exact Access Allow policy, verify the unauthenticated challenge, then connect the private data repository and enable production deployment.

Do not use public Pages, `workers.dev`, preview URLs, or obscurity for real snapshots. Follow [Cloudflare deployment](deployment/cloudflare.md).
