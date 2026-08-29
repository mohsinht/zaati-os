# Release process

1. Update `CHANGELOG.md`, migration notes, compatibility status, and the package version.
2. Run `npm ci` and `npm run check` from a clean checkout.
3. Verify the public synthetic GitHub Pages demo. When the release changes the maintained Cloudflare recipe, also verify an Access-protected synthetic deployment.
4. For every hosted provider path claimed as maintained, record a synthetic run through prompt generation, permission review, pull-request publication, independent validation, and dashboard refresh. Provider-neutral foundation releases do not imply hosted-provider certification.
5. Confirm GitHub Actions remain pinned to reviewed full commit SHAs.
6. Merge through the protected `Quality gate` and CodeQL checks.
7. Create and push a signed tag matching `vX.Y.Z`; the protected `v*` tag ruleset prevents later updates or deletion. Do not publish the GitHub release manually. The tag workflow reruns all checks before creating it.
8. Verify the release notes, signed and protected tag, immutable-release status, assets, demo, and fork-upgrade instructions.

Do not create a release when the complete-source, privacy, or independent-publication gates are failing. A shiny tag is not a security control, although it does look fetching.
