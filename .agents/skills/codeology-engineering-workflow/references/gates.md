# Engineering gates

## Plan gate

For standard or large work, record:

- observable acceptance criteria;
- files and contracts likely to change;
- tests and validation commands;
- dependency order and rollback path;
- decisions requiring user approval.

Do not hide unresolved product choices inside implementation details.

## Review gate

Before committing, confirm:

- new behavior has coverage;
- existing curriculum and upstream paths remain intact;
- learner-facing and assessor-only information remain separated;
- no generated or secret files are staged;
- documentation reflects new commands or contracts;
- `npm run ci` succeeds.

## Deployment gate

Preview deployment may follow successful CI when requested. Production deployment always requires an explicit request and configured GitHub/Vercel secrets.
