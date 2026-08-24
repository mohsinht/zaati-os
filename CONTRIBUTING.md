# Contributing

Zaati OS welcomes focused improvements that help users notice, decide, or act while retaining ownership of their data.

## Start here

1. Search existing issues and discussions.
2. For substantial architecture or contract changes, open a proposal before implementation.
3. Fork the repository and create a descriptive branch.
4. Keep all fixtures synthetic.
5. Run `npm ci` and `npm run check`.
6. Open a pull request using the template.

## Domain packs

A complete domain pack includes:

- one source catalog entry
- one provider-neutral prompt
- an existing or new versioned domain schema
- a synthetic snapshot covering success and one meaningful failure state
- renderer support using audited blocks
- validation tests
- permissions and privacy notes
- setup, disable, and removal instructions

No reviewer should need real user data, provider credentials, or access to a private deployment.

## Pull request quality

Describe the problem, the user decision improved, contract changes, privacy impact, tests, visual review, and rollback path. Breaking snapshot changes require a new version and migration notes.

By contributing, you agree that your contribution is licensed under Apache License 2.0.
