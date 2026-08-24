# Privacy and threat model

Zaati OS is private by architecture, not by a promise printed in a footer.

## Protected assets

- normalized personal snapshots
- instance preferences and enabled sources
- source and data-repository credentials
- compiled dashboard assets containing private facts
- deployment hostnames and account identifiers when users consider them sensitive

## Trust boundaries

Users separately trust their selected source providers, LLM provider or local model, private snapshot storage, Git host, CI runner, deployment host, identity provider, and authorized viewers. Zaati OS cannot change a third party's data retention or training terms.

## Primary threats and controls

| Threat | Control |
| --- | --- |
| Personal data committed to a public fork | Separate private data repository, ignored paths, tracked-file privacy scan |
| LLM writes outside its scope | One worker-owned deterministic path, source registry validation |
| Prompt injection requests code or secrets | Allowlisted inputs, forbidden inputs, schemas, no arbitrary rendering |
| Missing data produces a false conclusion | Explicit source status, partial and failed states, warnings, confidence |
| Static bundle served publicly | `workers_dev` and preview URLs disabled, custom domain behind Access |
| CI exposes data | No private build artifacts, no snapshot logging, secrets only on protected deployment events |
| A broad Access rule lets anyone in | Deny by default, exact emails or constrained identity groups, unauthenticated preflight |
| Credential committed accidentally | Common secret-shape scan, GitHub secret storage, scoped tokens |

## Data minimization

Keep a normalized action, measure, deadline, status, and evidence reference when they are enough. Avoid raw email bodies, full documents, attachments, statements, account identifiers, source code, customer data, authentication links, cookies, tokens, and unnecessary information about other people.

## Public fork rule

A public fork may contain schemas, prompts, reusable source definitions, UI, and synthetic examples. It must not contain real snapshots, local instance configuration, a compiled private dashboard, screenshots of real data, or deployment secrets.

## Static bundle warning

Client-side hiding is not authentication. Anyone who receives the built JavaScript can inspect the data embedded in it. Protect the entire hostname before deploying private data.

## Before the first private deployment

1. Deploy synthetic data only.
2. Attach a custom hostname.
3. Create a Cloudflare Access self-hosted application.
4. Use an exact Allow policy or a constrained identity group.
5. Test an authorized session.
6. Test an incognito unauthenticated request.
7. Run `npm run access:verify -- your.private.hostname`.
8. Only then connect the private data repository.
