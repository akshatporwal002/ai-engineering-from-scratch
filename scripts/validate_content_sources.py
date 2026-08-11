#!/usr/bin/env python3
"""Validate path ownership, imported baselines and adaptation provenance."""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "content-sources.yml"
NOTICE_PATH = ROOT / "THIRD_PARTY_NOTICES.md"
OVERRIDES_ROOT = ROOT / "content" / "overrides"
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
SOURCE_ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class Match:
    source_id: str
    pattern: str
    score: tuple[int, int]


def run_git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def load_registry(path: Path = REGISTRY_PATH) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"missing source registry: {path.relative_to(ROOT)}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"{path.relative_to(ROOT)} must be JSON-compatible YAML: {exc}"
        ) from exc
    if not isinstance(data, dict):
        raise ValueError("source registry root must be an object")
    return data


def pattern_score(pattern: str) -> tuple[int, int]:
    literal = len(re.sub(r"[*?\[\]]", "", pattern))
    return literal, pattern.count("/")


def resolve_source(path: str, sources: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    matches: list[Match] = []
    for source in sources:
        source_id = str(source.get("id", ""))
        for pattern in source.get("paths", []):
            if isinstance(pattern, str) and fnmatch.fnmatchcase(path, pattern):
                matches.append(Match(source_id, pattern, pattern_score(pattern)))
    if not matches:
        return None, f"{path}: no source rule matches"
    best_score = max(match.score for match in matches)
    winners = [match for match in matches if match.score == best_score]
    winner_ids = {match.source_id for match in winners}
    if len(winner_ids) != 1:
        detail = ", ".join(f"{match.source_id}:{match.pattern}" for match in winners)
        return None, f"{path}: ambiguous source rules at equal specificity ({detail})"
    return winners[0].source_id, None


def validate_registry_shape(registry: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if registry.get("schemaVersion") != 1:
        errors.append("content-sources.yml: schemaVersion must be 1")
    sources = registry.get("sources")
    if not isinstance(sources, list) or not sources:
        return errors + ["content-sources.yml: sources must be a non-empty array"]
    seen: set[str] = set()
    required = {"id", "kind", "project", "author", "url", "license", "paths"}
    for index, source in enumerate(sources):
        where = f"content-sources.yml: sources[{index}]"
        if not isinstance(source, dict):
            errors.append(f"{where} must be an object")
            continue
        missing = required - source.keys()
        if missing:
            errors.append(f"{where} missing fields {sorted(missing)}")
        source_id = source.get("id")
        if not isinstance(source_id, str) or not SOURCE_ID_RE.fullmatch(source_id):
            errors.append(f"{where}.id must use lowercase hyphen-case")
        elif source_id in seen:
            errors.append(f"{where}.id duplicates {source_id!r}")
        else:
            seen.add(source_id)
        kind = source.get("kind")
        if kind not in {"imported", "original"}:
            errors.append(f"{where}.kind must be imported or original")
        paths = source.get("paths")
        if not isinstance(paths, list) or not paths or not all(
            isinstance(pattern, str) and pattern for pattern in paths
        ):
            errors.append(f"{where}.paths must be a non-empty string array")
        if kind == "imported":
            for field in ("remote", "baselineCommit"):
                if not source.get(field):
                    errors.append(f"{where}.{field} is required for imported sources")
            baseline = source.get("baselineCommit")
            if not isinstance(baseline, str) or not COMMIT_RE.fullmatch(baseline):
                errors.append(f"{where}.baselineCommit must be a full lowercase SHA-1")
    return errors


def tracked_files() -> list[str]:
    output = run_git("ls-files", "--cached", "--others", "--exclude-standard")
    return sorted(line for line in output.splitlines() if line)


def load_sidecars() -> tuple[dict[str, dict[str, Any]], list[str]]:
    sidecars: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    if not OVERRIDES_ROOT.is_dir():
        return sidecars, errors
    for path in sorted(OVERRIDES_ROOT.glob("*/*.json")):
        rel = path.relative_to(ROOT).as_posix()
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"{rel}: invalid JSON: {exc}")
            continue
        required = {
            "schemaVersion",
            "sourceId",
            "canonicalPath",
            "baselineCommit",
            "adapted",
            "adaptationSummary",
        }
        if not isinstance(data, dict) or required - data.keys():
            missing = sorted(required - data.keys()) if isinstance(data, dict) else sorted(required)
            errors.append(f"{rel}: missing sidecar fields {missing}")
            continue
        canonical = data.get("canonicalPath")
        if not isinstance(canonical, str) or not canonical:
            errors.append(f"{rel}: canonicalPath must be a non-empty string")
            continue
        if canonical in sidecars:
            errors.append(f"{rel}: duplicate sidecar for {canonical}")
        sidecars[canonical] = data
        if data.get("schemaVersion") != 1 or data.get("adapted") is not True:
            errors.append(f"{rel}: schemaVersion must be 1 and adapted must be true")
        if not str(data.get("adaptationSummary", "")).strip():
            errors.append(f"{rel}: adaptationSummary is required")
    return sidecars, errors


def changed_paths_since(baseline: str) -> dict[str, str]:
    output = run_git("diff", "--name-status", baseline, "--")
    changes: dict[str, str] = {}
    for line in output.splitlines():
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R") and len(parts) == 3:
            changes[parts[1]] = "removed"
            changes[parts[2]] = "renamed"
        elif len(parts) == 2:
            changes[parts[1]] = {
                "A": "added",
                "D": "removed",
                "M": "modified",
            }.get(status[0], "modified")
    return changes


def audit(registry: dict[str, Any], files: list[str] | None = None) -> list[str]:
    errors = validate_registry_shape(registry)
    sources = registry.get("sources")
    if not isinstance(sources, list):
        return errors
    files = tracked_files() if files is None else files
    ownership: dict[str, str] = {}
    for path in files:
        source_id, error = resolve_source(path, sources)
        if error:
            errors.append(error)
        elif source_id:
            ownership[path] = source_id

    sidecars, sidecar_errors = load_sidecars()
    errors.extend(sidecar_errors)
    imported_sources = {
        source["id"]: source
        for source in sources
        if isinstance(source, dict) and source.get("kind") == "imported" and source.get("id")
    }
    for source_id, source in imported_sources.items():
        baseline = source.get("baselineCommit")
        if not isinstance(baseline, str) or not COMMIT_RE.fullmatch(baseline):
            continue
        try:
            run_git("cat-file", "-e", f"{baseline}^{{commit}}")
        except subprocess.CalledProcessError:
            errors.append(f"source {source_id}: baseline commit {baseline} is unavailable")
            continue
        changes = changed_paths_since(baseline)
        for path, change in changes.items():
            if change == "removed":
                continue
            owner = ownership.get(path)
            if owner != source_id:
                continue
            sidecar = sidecars.get(path)
            if not sidecar:
                errors.append(f"{path}: modified imported path requires an adaptation sidecar")
                continue
            if sidecar.get("sourceId") != source_id:
                errors.append(f"{path}: sidecar sourceId must be {source_id}")
            if sidecar.get("baselineCommit") != baseline:
                errors.append(f"{path}: sidecar baselineCommit must be {baseline}")

    for canonical, sidecar in sidecars.items():
        if canonical not in files:
            errors.append(f"sidecar canonicalPath does not exist: {canonical}")
            continue
        owner = ownership.get(canonical)
        if owner != sidecar.get("sourceId"):
            errors.append(
                f"{canonical}: sidecar sourceId {sidecar.get('sourceId')!r} "
                f"does not match resolved owner {owner!r}"
            )

    notice = NOTICE_PATH.read_text(encoding="utf-8") if NOTICE_PATH.is_file() else ""
    for source_id, source in imported_sources.items():
        for value_name in ("project", "url", "license", "baselineCommit"):
            value = str(source.get(value_name, ""))
            if value and value not in notice:
                errors.append(
                    f"THIRD_PARTY_NOTICES.md: missing {value_name} for source {source_id}"
                )
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit a JSON report")
    args = parser.parse_args(argv)
    try:
        registry = load_registry()
        errors = audit(registry)
    except (ValueError, subprocess.CalledProcessError) as exc:
        errors = [str(exc)]
    payload = {"ok": not errors, "errors": errors}
    if args.json:
        print(json.dumps(payload, indent=2))
    elif errors:
        for error in errors:
            print(f"ERROR: {error}")
    else:
        print("Content source registry and adaptation provenance are valid.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
