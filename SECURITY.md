# Security policy

## Supported versions

Security fixes target the latest minor release. During the `0.x` series, users should update to the newest published version before reporting a resolved issue.

## Report privately

Use GitHub's private vulnerability reporting for this repository. Do not open a public issue containing an exploit, secret, private snapshot, deployment hostname, account identifier, or identifying screenshot.

Include the affected version, impact, reproduction using synthetic data, and a suggested mitigation if available. Never test against someone else's deployment or data.

## Scope

Relevant reports include schema or bundle bypass, unsafe rendering, path ownership bypass, transaction rollback failure, encryption or key-handling weakness, secret exposure, authentication guidance that creates public data, CI leaks, supply-chain compromise, and cross-source data disclosure.

Encrypted snapshot mode is defense in depth for files at rest. It does not claim to protect data from an authorized workflow, build, deployment, browser session, or compromised provider. Reports that demonstrate a violation of this documented boundary are in scope.

Provider account security, model behavior outside the documented contract, and third-party service availability should also be reported to the responsible provider.
