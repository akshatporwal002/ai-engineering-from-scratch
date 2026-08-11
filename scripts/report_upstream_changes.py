#!/usr/bin/env python3
"""Generate deterministic Markdown and JSON reports for an upstream commit range."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path

from validate_content_sources import ROOT, load_registry


LESSON_RE = re.compile(r"^(phases/[^/]+/[^/]+)(?:/|$)")


@dataclass(frozen=True)
class Change:
    status: str
    path: str
    previous_path: str | None = None


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


def imported_source(source_id: str) -> dict[str, object]:
    registry = load_registry()
    for source in registry.get("sources", []):
        if isinstance(source, dict) and source.get("id") == source_id:
            if source.get("kind") != "imported":
                raise ValueError(f"source {source_id!r} is not imported")
            return source
    raise ValueError(f"unknown imported source: {source_id}")


def parse_name_status(raw: str) -> list[Change]:
    changes: list[Change] = []
    if "\0" in raw:
        fields = raw.split("\0")
        if fields and fields[-1] == "":
            fields.pop()
        index = 0
        while index < len(fields):
            code = fields[index]
            index += 1
            if code.startswith(("R", "C")):
                if index + 1 >= len(fields):
                    raise ValueError("truncated rename/copy entry in git diff output")
                previous, path = fields[index], fields[index + 1]
                index += 2
                status = "renamed" if code.startswith("R") else "copied"
                changes.append(Change(status, path, previous))
            else:
                if index >= len(fields):
                    raise ValueError("truncated path entry in git diff output")
                path = fields[index]
                index += 1
                status = {
                    "A": "added",
                    "D": "removed",
                    "M": "modified",
                    "T": "type-changed",
                }.get(code[0], "modified")
                changes.append(Change(status, path))
        return changes
    for line in raw.splitlines():
        if not line:
            continue
        parts = line.split("\t")
        code = parts[0]
        status = {
            "A": "added",
            "D": "removed",
            "M": "modified",
            "T": "type-changed",
        }.get(code[0], "modified")
        if code.startswith(("R", "C")) and len(parts) == 3:
            status = "renamed" if code.startswith("R") else "copied"
            changes.append(Change(status, parts[2], parts[1]))
        elif len(parts) == 2:
            changes.append(Change(status, parts[1]))
    return changes


def changed_lessons(changes: list[Change]) -> list[str]:
    lessons: set[str] = set()
    for change in changes:
        for candidate in (change.path, change.previous_path):
            if not candidate:
                continue
            match = LESSON_RE.match(candidate)
            if match:
                lessons.add(match.group(1))
    return sorted(lessons)


def commits(base: str, head: str) -> list[dict[str, str]]:
    raw = run_git(
        "log",
        "--reverse",
        "--format=%H%x09%aI%x09%s",
        f"{base}..{head}",
    )
    result: list[dict[str, str]] = []
    for line in raw.splitlines():
        sha, authored_at, subject = line.split("\t", 2)
        result.append({"sha": sha, "authoredAt": authored_at, "subject": subject})
    return result


def license_changed(base: str, head: str) -> bool:
    result = subprocess.run(
        ["git", "diff", "--quiet", base, head, "--", "LICENSE"],
        cwd=ROOT,
    )
    if result.returncode not in (0, 1):
        raise subprocess.CalledProcessError(result.returncode, result.args)
    return result.returncode == 1


def build_report(source_id: str, base: str, head: str) -> dict[str, object]:
    source = imported_source(source_id)
    raw = run_git("diff", "--name-status", "--find-renames", "-z", base, head, "--")
    changes = parse_name_status(raw)
    counts = Counter(change.status for change in changes)
    risk_paths = sorted(
        change.path
        for change in changes
        if change.path in {"LICENSE", "AGENTS.md", "site/build.js"}
        or change.path.startswith(("scripts/audit_", ".github/workflows/"))
    )
    return {
        "schemaVersion": 1,
        "sourceId": source_id,
        "project": source.get("project"),
        "sourceUrl": source.get("url"),
        "baseCommit": base,
        "headCommit": head,
        "license": source.get("license"),
        "licenseChanged": license_changed(base, head),
        "counts": dict(sorted(counts.items())),
        "changedLessons": changed_lessons(changes),
        "riskPaths": risk_paths,
        "commits": commits(base, head),
        "changes": [asdict(change) for change in changes],
    }


def render_markdown(report: dict[str, object]) -> str:
    counts = report["counts"]
    assert isinstance(counts, dict)
    changes = report["changes"]
    assert isinstance(changes, list)
    lessons = report["changedLessons"]
    assert isinstance(lessons, list)
    risk_paths = report["riskPaths"]
    assert isinstance(risk_paths, list)
    commit_rows = report["commits"]
    assert isinstance(commit_rows, list)

    def safe(value: object) -> str:
        return (
            str(value)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("`", "'")
            .replace("@", "@\u200b")
            .replace("\r", " ")
            .replace("\n", " ")
        )

    lines = [
        "# Upstream intake report",
        "",
        f"- Source: [{safe(report['project'])}]({safe(report['sourceUrl'])})",
        f"- Range: `{report['baseCommit']}` -> `{report['headCommit']}`",
        f"- Declared licence: `{report['license']}`",
        f"- Licence file changed: **{'YES - BLOCKED' if report['licenseChanged'] else 'no'}**",
        f"- Commits: {len(commit_rows)}",
        f"- Changed files: {len(changes)}",
        f"- Changed lesson directories: {len(lessons)}",
        "",
        "## Change summary",
        "",
    ]
    if counts:
        for status, count in sorted(counts.items()):
            lines.append(f"- {status}: {count}")
    else:
        lines.append("- No upstream changes detected.")
    lines.extend(["", "## Changed lessons", ""])
    lines.extend(f"- `{safe(lesson)}`" for lesson in lessons)
    if not lessons:
        lines.append("- None")
    lines.extend(["", "## High-attention paths", ""])
    lines.extend(f"- `{safe(path)}`" for path in risk_paths)
    if not risk_paths:
        lines.append("- None")
    lines.extend(["", "## Commits", ""])
    for commit in commit_rows:
        assert isinstance(commit, dict)
        lines.append(
            f"- `{str(commit['sha'])[:12]}` {safe(commit['subject'])} ({safe(commit['authoredAt'])})"
        )
    if not commit_rows:
        lines.append("- None")
    lines.extend(["", "## Files", ""])
    for item in changes:
        assert isinstance(item, dict)
        previous = f" (from `{safe(item['previous_path'])}`)" if item.get("previous_path") else ""
        lines.append(f"- **{safe(item['status'])}** `{safe(item['path'])}`{previous}")
    if not changes:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Required human review",
            "",
            "- Confirm the upstream licence and attribution remain acceptable.",
            "- Inspect lesson additions, removals and renames for stable-link migrations.",
            "- Resolve merge conflicts without discarding Codeology adaptations.",
            "- Confirm provenance validation, curriculum audits and the static build pass.",
            "- Review the rendered diff before merging. This report never authorizes auto-merge.",
            "",
        ]
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="ai-engineering-from-scratch")
    parser.add_argument("--base", help="override the registry baseline commit")
    parser.add_argument("--head", default="upstream/main")
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--json", dest="json_path", type=Path)
    parser.add_argument("--fail-on-license-change", action="store_true")
    args = parser.parse_args(argv)
    try:
        source = imported_source(args.source)
        base = args.base or str(source["baselineCommit"])
        head = run_git("rev-parse", args.head).strip()
        report = build_report(args.source, base, head)
        markdown = render_markdown(report)
        if args.markdown:
            args.markdown.parent.mkdir(parents=True, exist_ok=True)
            args.markdown.write_text(markdown, encoding="utf-8")
        else:
            print(markdown)
        if args.json_path:
            args.json_path.parent.mkdir(parents=True, exist_ok=True)
            args.json_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        if args.fail_on_license_change and report["licenseChanged"]:
            print("ERROR: upstream LICENSE changed; human licence review is required", file=sys.stderr)
            return 2
        return 0
    except (ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
