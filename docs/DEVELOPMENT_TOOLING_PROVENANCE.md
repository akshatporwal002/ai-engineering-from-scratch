# Development tooling provenance

The repository-local maintainer skills under `.agents/skills/` are original Codeology procedures informed by ideas evaluated from the following projects. They do not vendor either project or install their runtime dependencies.

## Everything Claude Code

- Project: Everything Claude Code (ECC)
- Source: https://github.com/affaan-m/ECC
- Licence: MIT at the time of review
- Ideas adapted: size-aware planning, gated feature/fix/change workflows, security review, skill stocktakes and context restraint

Codeology rewrites these ideas around its own commands, branch policy, curriculum contracts, provenance model and learner/assessor trust boundary.

## GitNexus

- Project: GitNexus
- Source: https://github.com/abhigyanpatwari/GitNexus
- Licence: PolyForm Noncommercial 1.0.0 at the time of review
- Idea referenced: optional graph-backed code exploration and change-impact analysis

GitNexus is not installed or required. The `codeology-code-intelligence` skill explicitly treats it as optional until its licence is appropriate for Codeology's intended use.
