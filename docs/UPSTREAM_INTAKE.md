# Upstream intake

Codeology follows AI Engineering from Scratch through the `upstream` Git remote while keeping discovery separate from merge and publication.

## Local report

```bash
git fetch upstream main
python scripts/report_upstream_changes.py \
  --head upstream/main \
  --markdown upstream-report.md \
  --json upstream-report.json \
  --fail-on-license-change
```

The report compares `upstream/main` with the reviewed baseline in `content-sources.yml`. It identifies commits, added/modified/removed/renamed files, affected lesson directories and high-attention paths. A changed `LICENSE` exits with status 2 and blocks automated intake.

## Automated workflow

`.github/workflows/upstream-intake.yml` runs weekly or by manual dispatch. It:

1. checks out the configured Codeology target branch;
2. fetches `upstream/main`;
3. exits without writes when the reviewed baseline is current;
4. generates and retains a deterministic report;
5. blocks immediately if the upstream licence changed;
6. creates an intake branch and performs a normal Git merge without automatic conflict resolution;
7. advances source and sidecar baseline SHAs only after the clean merge;
8. commits and pushes the prepared intake branch without executing upstream code while credentials are available;
9. opens a pull request into `codex/dev`;
10. removes credential access and runs `npm run ci`; the ordinary pull-request quality workflow independently repeats the gate.

The workflow never auto-merges or deploys. Merge conflicts, licence changes, failed tests or missing attribution stop the job for human review.

The checkout does not persist GitHub credentials. The write token is exposed only to the fixed `git push` and `gh pr` steps, never to merged upstream scripts or package commands.

The target branch must exist on `origin`, and repository Actions must be allowed to create pull requests. The workflow uses only the scoped `GITHUB_TOKEN`; it requires no upstream credentials because the source repository is public.
