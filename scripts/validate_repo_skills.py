#!/usr/bin/env python3
"""Validate repository-local Codeology maintainer skills using stdlib only."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SKILLS_ROOT = ROOT / ".agents" / "skills"
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def parse_frontmatter(text: str) -> tuple[dict[str, str], list[str]]:
    errors: list[str] = []
    if not text.startswith("---\n"):
        return {}, ["missing opening YAML frontmatter delimiter"]
    try:
        raw, _body = text[4:].split("\n---\n", 1)
    except ValueError:
        return {}, ["missing closing YAML frontmatter delimiter"]
    values: dict[str, str] = {}
    for line in raw.splitlines():
        if not line.strip():
            continue
        if ":" not in line:
            errors.append(f"invalid frontmatter line: {line!r}")
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip().strip('"')
    unexpected = set(values) - {"name", "description"}
    if unexpected:
        errors.append(f"unexpected frontmatter fields: {sorted(unexpected)}")
    return values, errors


def validate_skill(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.is_file():
        return ["missing SKILL.md"]
    text = skill_file.read_text(encoding="utf-8")
    fields, frontmatter_errors = parse_frontmatter(text)
    errors.extend(frontmatter_errors)
    name = fields.get("name", "")
    if name != skill_dir.name:
        errors.append(f"frontmatter name {name!r} does not match directory")
    if not NAME_RE.fullmatch(name):
        errors.append("name must use lowercase hyphen-case")
    if not fields.get("description"):
        errors.append("description is required")
    if "[TODO" in text:
        errors.append("contains an unfinished TODO placeholder")
    if len(text.splitlines()) > 500:
        errors.append("SKILL.md exceeds 500 lines")
    openai_file = skill_dir / "agents" / "openai.yaml"
    if not openai_file.is_file():
        errors.append("missing agents/openai.yaml")
    else:
        openai_text = openai_file.read_text(encoding="utf-8")
        if f"${name}" not in openai_text:
            errors.append("default prompt must mention the skill by name")
    return errors


def main() -> int:
    if not SKILLS_ROOT.is_dir():
        print("No repository maintainer skills found.")
        return 1
    failures: list[tuple[Path, str]] = []
    skill_dirs = sorted(path for path in SKILLS_ROOT.iterdir() if path.is_dir())
    for skill_dir in skill_dirs:
        for error in validate_skill(skill_dir):
            failures.append((skill_dir, error))
    if failures:
        for skill_dir, error in failures:
            print(f"ERROR {skill_dir.relative_to(ROOT)}: {error}")
        return 1
    print(f"Validated {len(skill_dirs)} repository maintainer skills.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
