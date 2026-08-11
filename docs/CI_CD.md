# Codeology CI/CD

## Local workflow

Run once after cloning:

```bash
npm run setup:dev
```

This configures Git to use `.githooks/pre-commit`. Every ordinary commit then runs the fast repository-skill, lesson and certification audits.

Use these explicit commands:

```bash
npm run check:precommit     # fast commit gate
npm test                    # full tests and non-generating audits
npm run ci                  # tests plus static-site build
npm run ci:strict           # CI plus the inherited global quiz-order migration gate
npm run deploy:preview      # CI then Vercel preview
npm run deploy:production   # CI then Vercel production
```

The repository intentionally does not commit a package lock because the inherited curriculum contract forbids it and the root package has no installed dependencies.

## GitHub Actions

`codeology-quality` runs `npm run ci` on `main`, `dev`, `codex/**`, pull requests and manual dispatches.

The translation publisher regression suite is Unix-specific. `npm run ci` runs it on GitHub's Ubuntu runner and reports an explicit skip on Windows; all platform-independent audits and certification tests still run locally.

`deploy-codeology` is manual. It runs the same CI command, builds with Vercel and deploys the prebuilt artifact. Create `preview` and `production` GitHub environments with these secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Require reviewers on the `production` environment. Preview may remain unprotected if desired.

## Known inherited gate

At the time this foundation was added, `python scripts/debias_quizzes.py --check` reported that 1,896 existing upstream quiz questions would be deterministically reordered. That is a large content migration rather than a failure caused by the CI/CD setup, so it remains available as `npm run check:legacy-quiz-order` and is included in `npm run ci:strict` instead of silently rewriting hundreds of imported lesson files.

Any new or modified curriculum content is still subject to the existing `.github/workflows/curriculum.yml` checks. The inherited quiz-order migration should be completed as its own reviewed content change before promoting the strict gate to mandatory Codeology CI.
