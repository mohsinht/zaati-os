# Troubleshooting

## The dashboard still shows synthetic data

No JSON files were found under `data/snapshots/` at build time. Verify the private repository checkout path and run `npm run data:build`. The script prints only the number of snapshots, not their contents.

## A snapshot fails validation

Read the first reported JSON pointer. Common causes are an unknown property, mismatched worker ID, wrong schema reference, duplicate block ID, invalid HTTPS link, incorrect path date, or a partial snapshot without warnings.

## The app says a source is missing

Confirm the source is enabled in the local instance configuration and its snapshot `source_id` matches the registry. Aggregates do not fabricate missing dependencies.

## Deployment has no public URL

That is the safe default. `workers_dev` and preview URLs are disabled. Set `ZAATI_HOSTNAME` and `ZAATI_WORKER_NAME`, then run the generated custom-domain deployment.

## Access verification fails

An unauthenticated request did not receive an Access redirect or denial. Check that the Access application covers the exact hostname and that the policy is active. Do not deploy private snapshots until the preflight passes.

## Cloudflare login accepts too many users

Remove broad Include rules such as Everyone or unrestricted login methods. Use exact email addresses, constrained domains with additional requirements, or an identity-provider group.

## Same-day workers conflict

Fetch the latest target branch, re-read today's owned file, rebuild it deterministically, and update only that file. Never force-push or edit another worker path.
