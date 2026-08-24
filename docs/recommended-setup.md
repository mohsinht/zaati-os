# Recommended setup

## Required happy path

1. Fork the public code repository.
2. Run `npm install`, `npm run setup`, and `npm run tutorial`.
3. Create one separate private data repository.
4. Test one three-source bundle manually.
5. Deploy synthetic data, configure Cloudflare Access, verify the challenge, then connect private data.

## Strong defaults

| Concern            | Recommendation                                                        |
| ------------------ | --------------------------------------------------------------------- |
| Scheduled workflow | One daily bundle task plus one weekly review task                     |
| First sources      | Agenda, work focus, and daily overview                                |
| Publication        | One validated Git commit per bundle                                   |
| Hosting            | Cloudflare Worker static assets on a custom Access-protected hostname |
| Repository         | Public code fork plus separate private snapshot repository            |
| Theme              | System font, comfortable density, system light or dark mode           |
| CI                 | Require validation and CodeQL before merging                          |

## Optional hardening

- Enable snapshot encryption before the first real snapshot.
- Protect the GitHub `production` environment with reviewers.
- Enable dependency graph, dependency review, Dependabot, secret scanning, and push protection.
- Use a fine-grained read-only deployment token for one private data repository.
- Add source-specific retention and secure-deletion procedures.

## Optional expansion

- Add a fourth source with `npm run source:add` only after the three-source loop is stable.
- Add custom theme tokens after the information hierarchy feels useful.
- Enable automatic deployment only after a manual private deployment passes.
- Add provider-specific adapters outside core when a simple command or scheduled workflow is not enough.
