# Development and deployment commands

| Command | Purpose |
|---|---|
| `npm run setup:dev` | Configure the tracked pre-commit hook for this clone |
| `npm run check:precommit` | Fast skill and curriculum invariants before a commit |
| `npm test` | Full audits and certification tests |
| `npm run build` | Generate the static site |
| `npm run ci` | Run the full pre-deployment quality gate |
| `npm run ci:strict` | Also enforce the inherited global quiz-order migration gate |
| `npm run deploy:preview` | Verify and deploy a Vercel preview using local Vercel auth |
| `npm run deploy:production` | Verify and deploy production using local Vercel auth |

GitHub Actions also exposes the manual `deploy-codeology` workflow. Configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as environment secrets for both `preview` and `production`. Protect the production environment with required reviewers.
