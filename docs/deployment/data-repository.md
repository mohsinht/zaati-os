# Private data repository

The recommended public-fork architecture stores code and private snapshots in different repositories.

## Repository shape

Create a new private repository. Do not fork the public code repository for data.

```text
data/
  snapshots/
    <domain>/
      <source>/
        <YYYY>/
          <MM>/
            <YYYY-MM-DD>.json
            <YYYY-MM-DD>.json.enc  # optional encrypted mode
README.md
```

The public source catalog and schemas remain in the code repository. Workers read those current contracts and write only their registered path in the private repository.

## Credentials

Use separate, least-privilege identities:

- The LLM workflow needs permission to create a branch and pull request only in the private data repository. Prefer its existing GitHub connection instead of putting a token inside the prompt.
- The deployment workflow needs a fine-grained token restricted to this one private repository with Contents read permission.
- Cloudflare credentials never belong in the data repository.

Store the deployment read token as the `ZAATI_DATA_REPOSITORY_TOKEN` secret in the protected GitHub production environment.

## Independent validation gate

Install the gate from the code fork:

```bash
npm run data-repository:init -- --repository-root ../zaati-data --code-repository YOUR_USER/zaati-os --code-ref FULL_COMMIT_SHA
```

Commit the generated `zaati.data.json` and workflow, then require `Validate Zaati snapshots` in branch protection. Use an immutable 40-character commit SHA until a reviewed release tag exists.

## Bundle writes

A daily producer creates one branch and pull request containing every current-date path. It must never publish a subset, write directly to the default branch, edit the validation workflow, or merge its own pull request. The independent gate compares the candidate with the authoritative expected source set and rechecks paths, ownership, schemas, privacy rules, and encryption mode.

Single-source workers remain supported for independent cadences, but they use the same pull-request gate.

Same-day reruns replace the same file and preserve `snapshot_id`. Workers fetch the latest target branch before writing and never force-push.

Encrypted mode stores only `.json.enc` envelopes. Keep `ZAATI_SNAPSHOT_KEY` in the validator and deployment environments, never in the repository or generated prompt. A hosted LLM workflow should not receive this key. Use encrypted mode with a trusted local or CI ingestion process.

## Retention

Git history retains deleted values. If a source requires hard deletion, use an approved history-rewrite procedure inside the private repository and rotate any exposed credential. A normal file deletion is not a secure erasure.

Set source-specific retention in your operational policy. Follow [Data lifecycle and key recovery](../data-lifecycle.md) before deleting or rotating encrypted data.
