#!/usr/bin/env python3
"""Advance one reviewed imported-source baseline and its provenance records."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "content-sources.yml"
NOTICE = ROOT / "THIRD_PARTY_NOTICES.md"
OVERRIDES = ROOT / "content" / "overrides"
SHELL_CONFIG = ROOT / "site" / "codeology-config.json"
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")


def commit_sha(ref: str) -> str:
    result = subprocess.run(
        ["git", "rev-parse", f"{ref}^{{commit}}"],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
    )
    sha = result.stdout.strip()
    if not COMMIT_RE.fullmatch(sha):
        raise ValueError(f"ref did not resolve to a full commit SHA: {ref}")
    return sha


def is_ancestor(old: str, new: str) -> bool:
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", old, new],
        cwd=ROOT,
    )
    if result.returncode not in (0, 1):
        raise subprocess.CalledProcessError(result.returncode, result.args)
    return result.returncode == 0


def write_atomic(path: Path, text: str) -> None:
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def advance(source_id: str, new_ref: str) -> tuple[str, str]:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    source = next(
        (
            item
            for item in registry.get("sources", [])
            if isinstance(item, dict) and item.get("id") == source_id
        ),
        None,
    )
    if not source or source.get("kind") != "imported":
        raise ValueError(f"unknown imported source: {source_id}")
    old = str(source.get("baselineCommit", ""))
    new = commit_sha(new_ref)
    if old == new:
        return old, new
    if not is_ancestor(old, new):
        raise ValueError(f"new baseline {new} is not a descendant of {old}")

    notice = NOTICE.read_text(encoding="utf-8")
    if old not in notice:
        raise ValueError("old baseline is missing from THIRD_PARTY_NOTICES.md")

    source_dir = OVERRIDES / source_id
    sidecar_updates: list[tuple[Path, dict[str, object]]] = []
    for sidecar_path in sorted(source_dir.glob("*.json")):
        sidecar = json.loads(sidecar_path.read_text(encoding="utf-8"))
        if sidecar.get("sourceId") != source_id:
            continue
        if sidecar.get("baselineCommit") != old:
            raise ValueError(f"sidecar baseline drift: {sidecar_path.relative_to(ROOT)}")
        sidecar["baselineCommit"] = new
        sidecar_updates.append((sidecar_path, sidecar))

    shell_config: dict[str, object] | None = None
    if SHELL_CONFIG.exists():
        shell_config = json.loads(SHELL_CONFIG.read_text(encoding="utf-8"))
        academy_source = shell_config.get("academySource")
        if isinstance(academy_source, dict) and academy_source.get("sourceId") == source_id:
            if academy_source.get("baselineCommit") != old:
                raise ValueError("public shell source baseline drift")
            academy_source["baselineCommit"] = new
        else:
            shell_config = None

    # Validate every participant before replacing any file. Each replacement is
    # atomic, and the surrounding Git merge remains the rollback boundary.
    source["baselineCommit"] = new
    write_atomic(REGISTRY, json.dumps(registry, indent=2) + "\n")
    write_atomic(NOTICE, notice.replace(old, new))
    for sidecar_path, sidecar in sidecar_updates:
        write_atomic(sidecar_path, json.dumps(sidecar, indent=2) + "\n")
    if shell_config is not None:
        write_atomic(SHELL_CONFIG, json.dumps(shell_config, indent=2) + "\n")
    return old, new


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="ai-engineering-from-scratch")
    parser.add_argument("--new-ref", required=True)
    args = parser.parse_args(argv)
    try:
        old, new = advance(args.source, args.new_ref)
    except (ValueError, json.JSONDecodeError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Advanced {args.source}: {old} -> {new}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
