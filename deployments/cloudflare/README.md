# Cloudflare deployment assets

The production recipe is intentionally split:

- `wrangler.jsonc` is a public, safe base with no account or hostname.
- `scripts/configure-deployment.mjs` generates an ignored custom-domain configuration.
- `scripts/verify-access.mjs` challenges the hostname before private snapshots are imported.
- `.github/workflows/deploy-cloudflare.yml` performs the protected deployment.

See [`docs/deployment/cloudflare.md`](../../docs/deployment/cloudflare.md) for the full sequence.
