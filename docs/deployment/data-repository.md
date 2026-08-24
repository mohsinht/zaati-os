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
README.md
```

The public source catalog and schemas remain in the code repository. Workers read those current contracts and write only their registered path in the private repository.

## Credentials

Use separate, least-privilege identities:

- The LLM workflow needs write access only to the private data repository. Prefer its existing GitHub connection instead of putting a token inside the prompt.
- The deployment workflow needs a fine-grained token restricted to this one private repository with Contents read permission.
- Cloudflare credentials never belong in the data repository.

Store the deployment read token as the `ZAATI_DATA_REPOSITORY_TOKEN` secret in the protected GitHub production environment.

## Worker writes

A worker should create `ingest/<worker-id>/<YYYY-MM-DD>`, change one owned JSON file, and open a pull request. For a single-user repository, direct default-branch commits are possible, but pull requests preserve validation and audit history.

Same-day reruns replace the same file and preserve `snapshot_id`. Workers fetch the latest target branch before writing and never force-push.

## Retention

Git history retains deleted values. If a source requires hard deletion, use an approved history-rewrite procedure inside the private repository and rotate any exposed credential. A normal file deletion is not a secure erasure.

Set source-specific retention in your operational policy. Zaati OS does not upload or prune the repository on your behalf.
