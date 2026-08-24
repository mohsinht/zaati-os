# Maintainer setup

GitHub repository security features need a one-time configuration after the initial foundation is merged.

## Security and analysis

In repository Settings, Security and analysis:

1. Enable Dependency graph.
2. Enable Dependabot alerts and security updates.
3. Enable secret scanning and push protection when available.
4. Enable private vulnerability reporting.
5. Add repository variable `DEPENDENCY_REVIEW_ENABLED=true`.

The dependency review workflow remains safely skipped until that variable is set. This avoids a false failing check on new repositories where the dependency graph API is not yet active.

## Branch protection

After the first successful runs, protect `main`:

- require a pull request before merging
- require the CI `Quality gate` job
- require CodeQL when available
- require dependency review after enabling it
- require conversation resolution
- block force pushes and branch deletion
- apply the rules to administrators unless an emergency procedure says otherwise

For every private data repository, add a second ruleset for `.github/**` and `zaati.data.json`. Require trusted-owner review and block the producer identity from bypassing it. The producer needs Contents and Pull requests write access only. It must have no Actions, Workflows, Administration, secrets, variables, environments, or repository-settings write access.

Do not require the deployment workflow for code pull requests. It intentionally runs only for manual dispatch or configured main-branch deployment.

## Production environment

Create an environment named `production`. Add the variables and secrets from [Cloudflare deployment](deployment/cloudflare.md). Use required reviewers for this environment when available.

Keep deployment secrets at the environment level so pull requests and routine CI cannot access them.

If encrypted snapshots are enabled, add `ZAATI_SNAPSHOT_KEY` only to this protected environment. Do not add it as a repository-wide variable, workflow file, build artifact, or pull request secret.
