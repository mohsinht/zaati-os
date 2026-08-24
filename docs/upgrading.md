# Upgrade and fork sync

Zaati OS is designed to be forked. Keep personal snapshots in a separate private repository so upstream updates remain ordinary code changes.

## Sync a fork

```bash
git remote add upstream https://github.com/mohsinht/zaati-os.git
git fetch upstream --tags
git switch main
git merge --ff-only upstream/main
npm ci
npm run check
```

If the fast-forward is refused, create a branch and merge or rebase there. Resolve customization conflicts deliberately, run the full check, and merge through a pull request. Never overwrite private snapshot history to sync application code.

## Contract changes

Read `CHANGELOG.md` before updating the immutable `code_ref` in each private data repository. Validate a synthetic bundle against the new ref, then update the validator in a focused pull request. Keep the previous ref available until the first new candidate and deployment pass.

Breaking schema changes require a documented migration and a version bump. Presentation-only changes should not require rewriting durable `data.facts`.

## Rollback

Revert the code fork and private validator to the previous reviewed commit or release tag. Do not roll encrypted files back unless the matching key is still available.
