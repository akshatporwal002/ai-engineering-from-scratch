#!/usr/bin/env python3
"""Validate Codeology's browser auth, progress sync, and database boundary."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
AUTH = ROOT / "site" / "auth.js"
PROGRESS = ROOT / "site" / "progress.js"
SHELL = ROOT / "site" / "codeology-shell.js"
CSS = ROOT / "site" / "codeology.css"
BUILD = ROOT / "scripts" / "build-auth.mjs"
PACKAGE = ROOT / "package.json"
ENV_EXAMPLE = ROOT / ".env.example"
MIGRATIONS = ROOT / "supabase" / "migrations"


def audit(
    auth: str,
    progress: str,
    shell: str,
    css: str,
    build: str,
    package: dict,
    env_example: str,
    migration: str,
) -> list[str]:
    errors: list[str] = []

    required_auth = (
        "signInWithOAuth",
        "provider: provider",
        "client.auth.signOut()",
        "client.from('lesson_progress')",
        "onConflict: 'user_id,lesson_path'",
        "codeology:progress-owner:v1",
        "Only your account and learning progress are stored",
    )
    for contract in required_auth:
        if contract not in auth:
            errors.append(f"site/auth.js: missing auth/progress contract {contract!r}")

    for forbidden in ("service_role", "SUPABASE_SECRET", "sb_secret_"):
        if forbidden in auth or forbidden in env_example:
            errors.append(f"public auth configuration must not contain {forbidden!r}")

    for contract in ("completionUpdatedAt", "exportState", "replaceState"):
        if contract not in progress:
            errors.append(f"site/progress.js: missing sync contract {contract!r}")

    for contract in (
        "data-codeology-auth-trigger",
        "codeology-auth-config.js",
        "vendor/supabase.js",
        "auth.js",
    ):
        if contract not in shell:
            errors.append(f"site/codeology-shell.js: missing auth integration {contract!r}")
    if "sourceLink('GitHub', config.product.repositoryUrl)" in shell:
        errors.append("site/codeology-shell.js: GitHub nav action must be replaced by login")

    for selector in (".codeology-login-button", ".codeology-auth-dialog", ".codeology-auth-providers"):
        if selector not in css:
            errors.append(f"site/codeology.css: missing auth UI selector {selector!r}")

    dependencies = package.get("dependencies", {})
    dev_dependencies = package.get("devDependencies", {})
    if not re.fullmatch(r"\d+\.\d+\.\d+", str(dependencies.get("@supabase/supabase-js", ""))):
        errors.append("package.json: @supabase/supabase-js must be pinned exactly")
    if not re.fullmatch(r"\d+\.\d+\.\d+", str(dev_dependencies.get("esbuild", ""))):
        errors.append("package.json: esbuild must be pinned exactly")
    if "build-auth.mjs" not in package.get("scripts", {}).get("build", ""):
        errors.append("package.json: build must generate browser auth assets")

    for contract in (
        "CODEOLOGY_SUPABASE_URL",
        "CODEOLOGY_SUPABASE_PUBLISHABLE_KEY",
        "window.CODEOLOGY_AUTH_CONFIG",
    ):
        if contract not in build and contract not in env_example:
            errors.append(f"auth build configuration is missing {contract!r}")

    migration_lower = migration.lower()
    required_sql = (
        "create table public.lesson_progress",
        "enable row level security",
        "to authenticated",
        "auth.uid()",
        "with check",
        "revoke all on table public.lesson_progress from anon",
        "on delete cascade",
    )
    for contract in required_sql:
        if contract not in migration_lower:
            errors.append(f"lesson progress migration is missing {contract!r}")
    if "grant" in migration_lower and "service_role" in migration_lower:
        errors.append("lesson progress migration must not grant service_role access")
    if migration_lower.count("create policy") < 4:
        errors.append("lesson progress migration requires separate CRUD ownership policies")

    return errors


def migration_text() -> str:
    candidates = sorted(MIGRATIONS.glob("*_create_lesson_progress.sql"))
    if len(candidates) != 1:
        return ""
    return candidates[0].read_text(encoding="utf-8")


def repository_errors() -> list[str]:
    return audit(
        AUTH.read_text(encoding="utf-8"),
        PROGRESS.read_text(encoding="utf-8"),
        SHELL.read_text(encoding="utf-8"),
        CSS.read_text(encoding="utf-8"),
        BUILD.read_text(encoding="utf-8"),
        json.loads(PACKAGE.read_text(encoding="utf-8")),
        ENV_EXAMPLE.read_text(encoding="utf-8"),
        migration_text(),
    )


def main() -> int:
    errors = repository_errors()
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology auth, local-first progress sync, and RLS contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
