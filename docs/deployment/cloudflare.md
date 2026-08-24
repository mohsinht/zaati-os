# Private Cloudflare deployment

Zaati OS deploys the Vite bundle as Cloudflare Worker static assets. The committed base configuration serves `./dist`, uses SPA fallback, and disables both `workers.dev` and preview URLs. Personal hostnames and account identifiers are generated from environment variables.

Cloudflare documents the same `assets.directory` and `single-page-application` pattern in its [SPA static-assets guide](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/). Custom-domain routes are documented in [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Required GitHub variables

Create a protected environment named `production`, then add:

| Variable                | Example shape          | Purpose                                        |
| ----------------------- | ---------------------- | ---------------------------------------------- |
| `ZAATI_WORKER_NAME`     | `zaati-private`        | Cloudflare Worker name                         |
| `ZAATI_HOSTNAME`        | `life.example.com`     | Exact custom hostname                          |
| `ZAATI_ACCESS_VERIFIED` | `true`                 | Enables private-data deploy after verification |
| `ZAATI_DATA_REPOSITORY` | `account/private-data` | Optional private snapshot repository           |
| `ZAATI_DATA_REF`        | `main`                 | Private data branch                            |
| `ZAATI_AUTO_DEPLOY`     | `true`                 | Optional main-branch deployment                |

Add these environment secrets:

| Secret                        | Permission                                                |
| ----------------------------- | --------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`       | Target account ID                                         |
| `CLOUDFLARE_API_TOKEN`        | Scoped Workers edit token                                 |
| `ZAATI_INSTANCE_CONFIG_JSON`  | Complete instance JSON, optional                          |
| `ZAATI_DATA_REPOSITORY_TOKEN` | Read-only access to one private data repository, optional |
| `ZAATI_SNAPSHOT_KEY`          | Optional 256-bit encrypted-snapshot key                   |

Cloudflare's [GitHub Actions guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) recommends storing the API token and account ID as CI secrets and scoping the token to the target account.

## Safe sequence

### 1. Deploy synthetic data

Set the Worker name, hostname, and Cloudflare credentials. Leave the private data repository unset. Run the `Deploy private dashboard` workflow manually.

The generated configuration attaches the Worker to the custom hostname. Only synthetic demo data exists at this point.

### 2. Add Access

In Cloudflare Zero Trust:

1. Go to Access controls, Applications.
2. Create a Self-hosted and private application.
3. Add the exact public hostname.
4. Add an Allow policy for exact emails or a constrained identity group.
5. Select the identity provider and a suitable session duration.
6. Test an authorized login.
7. Test an incognito request that must be challenged.

Cloudflare states that Access applications are deny by default and a user must match an Allow policy in its [self-hosted application guide](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).

Do not use Everyone or unrestricted One-time PIN as an Allow rule. Cloudflare lists both as [common Access misconfigurations](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/). If you use email codes, configure [One-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) and still restrict the Allow policy to intended users.

### 3. Verify from outside the session

```bash
npm run access:verify -- life.example.com
```

The command expects an unauthenticated Access redirect or denial. It never sends credentials.

### 4. Connect private data

Set `ZAATI_ACCESS_VERIFIED=true`, the private repository variables, and its read-only token. Run the deployment again. The workflow verifies Access before checking out snapshots, validates locally, builds without uploading an artifact, and deploys the static bundle.

If encrypted snapshots are enabled, also set `ZAATI_SNAPSHOT_KEY` in the protected environment and set `storage.snapshot_encryption` to `true` in `ZAATI_INSTANCE_CONFIG_JSON`. The key is available only to the validation and build step.

### 5. Enable automatic deployment

Set `ZAATI_AUTO_DEPLOY=true` only after the manual private deployment passes. Protect the `production` environment with required reviewers if the account supports it.

## Local deployment

```bash
export ZAATI_WORKER_NAME="your-worker-name"
export ZAATI_HOSTNAME="your.private.hostname"
npm run access:verify -- "$ZAATI_HOSTNAME"
npm run deploy
```

Wrangler creates an ignored generated configuration. Do not commit it.

## Security and cache headers

`public/_headers` adds a restrictive content security policy, disables framing and unnecessary browser capabilities, prevents indexing, and applies no-store caching to HTML and dashboard data. Hashed application assets use private immutable caching for fast repeat loads. Cloudflare documents `_headers` support for Worker static assets in [Static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).

## Rollback

Use Cloudflare's Worker version history to restore the previous deployment. If a private bundle was exposed, remove the custom route or Worker version immediately, fix Access, inspect access logs, rotate affected secrets, and treat the displayed facts as disclosed.
