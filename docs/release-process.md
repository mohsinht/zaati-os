# Release process

1. Update `CHANGELOG.md`, migration notes, compatibility status, and the package version.
2. Run `npm ci` and `npm run check` from a clean checkout.
3. Verify the synthetic GitHub Pages demo and an Access-protected synthetic Cloudflare deployment.
4. Run the maintained ChatGPT path through prompt generation, permission review, pull-request publication, independent validation, and dashboard refresh.
5. Confirm GitHub Actions remain pinned to reviewed full commit SHAs.
6. Merge through the protected `Quality gate` and CodeQL checks.
7. Create a signed or protected `vX.Y.Z` tag. The release workflow reruns all checks before creating the GitHub release.
8. Verify the release notes, tag, assets, demo, and fork-upgrade instructions.

Do not create a release when the complete-source, privacy, or independent-publication gates are failing. A shiny tag is not a security control, although it does look fetching.
