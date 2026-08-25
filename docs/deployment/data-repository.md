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

- The LLM workflow needs only **Contents: read and write** plus **Pull requests: read and write** in the private data repository. Explicitly deny Actions, Workflows, Administration, repository settings, environments, secrets, and variables write access. Prefer a narrowly configured GitHub App or fine-grained credential instead of putting a token inside the prompt.
- The deployment workflow needs a fine-grained token restricted to this one private repository with Contents read permission.
- Cloudflare credentials never belong in the data repository.

Store the deployment read token as the `ZAATI_DATA_REPOSITORY_TOKEN` secret in the protected GitHub production environment.

## Independent validation gate

Install the gate from the code fork:

```bash
npm run data-repository:init -- --repository-root ../zaati-data --code-repository YOUR_USER/zaati-os --code-ref FULL_COMMIT_SHA
```

Commit the generated `zaati.data.json` and workflow, then require `Validate Zaati snapshots` in branch protection. Use an immutable 40-character commit SHA until a reviewed release tag exists.

The generated gate uses `pull_request_target` only to load the validator workflow from the protected base branch. It checks out the candidate commit as inert data, runs no candidate scripts, disables persisted credentials, and executes validator code from the immutable Zaati revision. Candidate branches therefore cannot replace the workflow while preserving its check name.

Add a ruleset or CODEOWNERS requirement for `.github/**` and `zaati.data.json` that requires a trusted human or GitHub team. The producing identity must not bypass that ruleset. Enable GitHub secret scanning and push protection where available.

## Bundle writes

A daily producer creates one branch and pull request containing every current-date path. Candidate JSON exists in private Git history before pull-request validation runs, so minimize and scan it before the first push. The gate prevents invalid data from merging, not from entering a candidate branch. The producer must never publish a subset, write directly to the default branch, edit protected files, or merge its own pull request.

Single-source and custom bundles use the same gate. Initialize the exact Prompt Studio selection with `--sources`:

```bash
npm run data-repository:init -- --repository-root ../zaati-data --code-repository YOUR_USER/zaati-os --code-ref FULL_COMMIT_SHA --sources money:pulse
```

Same-day reruns replace the same file and preserve `snapshot_id`. Workers fetch the latest target branch before writing and never force-push.

Encrypted mode stores only `.json.enc` envelopes. Keep `ZAATI_SNAPSHOT_KEY` in the validator and deployment environments, never in the repository or generated prompt. A hosted LLM workflow should not receive this key. Use encrypted mode with a trusted local or CI ingestion process.

## Retention

Git history retains deleted values. If a source requires hard deletion, use an approved history-rewrite procedure inside the private repository and rotate any exposed credential. A normal file deletion is not a secure erasure.

Set source-specific retention in your operational policy. Follow [Data lifecycle and key recovery](../data-lifecycle.md) before deleting or rotating encrypted data.
