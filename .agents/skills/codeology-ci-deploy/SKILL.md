---
name: codeology-ci-deploy
description: Configure, run, diagnose, and improve Codeology local checks, pre-commit hooks, GitHub Actions, build validation, preview deployments, and production deployments. Use when preparing a commit, investigating CI, changing automation, or deploying the static Vercel site.
---

# Codeology CI and Deploy

Read [references/commands.md](references/commands.md).

1. Inspect the current branch, working tree, workflow and deployment configuration.
2. Run the narrowest failing command locally, fix the root cause, then run `npm run ci`.
3. Keep local, pre-commit and CI commands aligned through `package.json`.
4. Preserve existing curriculum automation unless intentionally replacing it.
5. Pin high-trust CI actions where practical and use least-privilege permissions.
6. Never print, persist or pass secrets through untrusted code.
7. Deploy preview only after successful CI and explicit authorization.
8. Deploy production only after explicit authorization and protected-environment approval.
9. Report the deployed revision and URL; never imply success without a completed deployment result.

Do not bypass checks, use `--no-verify`, or change assertions simply to obtain a green run.
