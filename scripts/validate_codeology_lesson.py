#!/usr/bin/env python3
"""Validate the adapted Codeology lesson reader and pinned provenance badge."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from validate_codeology_home import audit_baselines


ROOT = Path(__file__).resolve().parent.parent
LESSON = ROOT / "site" / "lesson.html"
SHELL = ROOT / "site" / "codeology-shell.js"
BASELINES = {
    ROOT / "docs" / "visual-baselines" / "lesson-desktop-light.jpg": (1430, 993),
    ROOT / "docs" / "visual-baselines" / "lesson-mobile-dark.jpg": (380, 822),
}


def audit(lesson: str, shell: str) -> list[str]:
    errors: list[str] = []
    required_lesson = (
        "<title>Lesson · Codeology</title>",
        '<link rel="canonical" href="lesson.html">',
        "window.location.origin",
        "AI Engineering Foundations",
        "title + ' · Codeology'",
        "isBasedOn: 'https://github.com/rohitg00/ai-engineering-from-scratch'",
        "license: 'https://opensource.org/license/mit'",
        "new CustomEvent('codeology:lesson-rendered')",
        'codeology.css?v=20260812c',
    )
    for contract in required_lesson:
        if contract not in lesson:
            errors.append(f"site/lesson.html: missing lesson contract {contract!r}")
    forbidden_lesson = (
        '<link rel="canonical" href="https://aiengineeringfromscratch.com/',
        'property="og:image"',
        'name="twitter:image"',
        "https://aiengineeringfromscratch.com' + window.location.pathname",
    )
    for contract in forbidden_lesson:
        if contract in lesson:
            errors.append(f"site/lesson.html: inherited metadata remains active: {contract!r}")
    if not re.search(r"document\.title\s*=.*' · Codeology'", lesson, re.DOTALL):
        errors.append("site/lesson.html: rendered lesson title must identify Codeology")

    required_shell = (
        "function currentLessonPath()",
        "function pinnedSourceUrl(source, path)",
        "function addLessonSourceBadge(config)",
        "Imported lesson source",
        "View pinned source",
        "source.baselineCommit",
        "path.split('/').map(encodeURIComponent).join('/')",
        "segment === '..'",
        "document.addEventListener('codeology:lesson-rendered'",
    )
    for contract in required_shell:
        if contract not in shell:
            errors.append(f"site/codeology-shell.js: missing lesson-source contract {contract!r}")
    if "if (!/^(phases|certifications)\\/[A-Za-z0-9._/-]+$/.test(path)) return null;" not in shell:
        errors.append("site/codeology-shell.js: lesson path must use the strict curriculum allowlist")
    return errors


def audit_css(css: str) -> list[str]:
    if 'html[data-product="codeology"] .lesson-layout' not in css or "padding-top: var(--header-offset)" not in css:
        return ["site/codeology.css: lesson layout must clear the fixed two-row Codeology header"]
    return []


def main() -> int:
    errors = audit(
        LESSON.read_text(encoding="utf-8"),
        SHELL.read_text(encoding="utf-8"),
    ) + audit_css((ROOT / "site" / "codeology.css").read_text(encoding="utf-8")) + audit_baselines(BASELINES)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology lesson metadata, provenance and visual contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
