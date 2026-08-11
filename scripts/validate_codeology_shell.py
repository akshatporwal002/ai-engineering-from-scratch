#!/usr/bin/env python3
"""Validate Codeology brand configuration, source metadata and core tokens."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "site" / "codeology-config.json"
CSS = ROOT / "site" / "codeology.css"
SHELL = ROOT / "site" / "codeology-shell.js"
HEADER = ROOT / "site" / "header.js"
SOURCES = ROOT / "content-sources.yml"
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")


def audit(
    config: dict[str, Any],
    css: str,
    shell: str,
    header: str,
    registry: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    if config.get("schemaVersion") != 1:
        errors.append("site/codeology-config.json: schemaVersion must be 1")
    product = config.get("product")
    source = config.get("academySource")
    if not isinstance(product, dict):
        errors.append("site/codeology-config.json: product must be an object")
        product = {}
    if not isinstance(source, dict):
        errors.append("site/codeology-config.json: academySource must be an object")
        source = {}
    for field in ("name", "shortName", "tagline", "repositoryUrl"):
        if not str(product.get(field, "")).strip():
            errors.append(f"site/codeology-config.json: product.{field} is required")
    repository_url = str(product.get("repositoryUrl", ""))
    if repository_url and not re.fullmatch(
        r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository_url
    ):
        errors.append("site/codeology-config.json: product.repositoryUrl must be a GitHub HTTPS repository")
    navigation = product.get("navigation")
    if not isinstance(navigation, list) or not navigation:
        errors.append("site/codeology-config.json: product.navigation must be a non-empty array")
    else:
        labels: set[str] = set()
        hrefs: set[str] = set()
        for index, item in enumerate(navigation):
            where = f"site/codeology-config.json: product.navigation[{index}]"
            if not isinstance(item, dict):
                errors.append(f"{where} must be an object")
                continue
            label = str(item.get("label", "")).strip()
            href = str(item.get("href", "")).strip()
            if not label or not href:
                errors.append(f"{where} requires label and href")
            if label in labels or href in hrefs:
                errors.append(f"{where} duplicates a navigation label or destination")
            labels.add(label)
            hrefs.add(href)
            if not re.fullmatch(r"[a-z0-9][a-z0-9.-]*\.html(?:#[A-Za-z][A-Za-z0-9_-]*)?", href):
                errors.append(f"{where}.href must be a local public route")
    for field in ("sourceId", "name", "author", "url", "license", "baselineCommit"):
        if not str(source.get(field, "")).strip():
            errors.append(f"site/codeology-config.json: academySource.{field} is required")
    source_url = str(source.get("url", ""))
    if source_url and not source_url.startswith("https://github.com/"):
        errors.append("site/codeology-config.json: academySource.url must use GitHub HTTPS")
    baseline = str(source.get("baselineCommit", ""))
    if baseline and not COMMIT_RE.fullmatch(baseline):
        errors.append("site/codeology-config.json: academySource.baselineCommit must be a full SHA")

    registry_source = next(
        (
            item
            for item in registry.get("sources", [])
            if isinstance(item, dict) and item.get("id") == source.get("sourceId")
        ),
        None,
    )
    if not registry_source:
        errors.append("site/codeology-config.json: academy source is absent from content-sources.yml")
    else:
        comparisons = {
            "project": source.get("name"),
            "author": source.get("author"),
            "url": source.get("url"),
            "license": source.get("license"),
            "baselineCommit": source.get("baselineCommit"),
        }
        for field, value in comparisons.items():
            if registry_source.get(field) != value:
                errors.append(f"site/codeology-config.json: academySource {field} drifts from registry")

    required_css = (
        "--codeology-canvas: #ffffff",
        "--codeology-canvas: #000000",
        "--codeology-accent:",
        "--codeology-radius-md:",
        "background-image: none",
        ".codeology-source-strip",
    )
    for token in required_css:
        if token not in css:
            errors.append(f"site/codeology.css: missing required token/rule {token!r}")
    color_values: dict[str, list[str]] = {}
    for name, value in re.findall(
        r"--codeology-(canvas|ink|accent|display-accent):\s*(#[0-9a-fA-F]{6})",
        css,
    ):
        color_values.setdefault(name, []).append(value)
    for theme_index, theme in enumerate(("light", "dark")):
        try:
            canvas = color_values["canvas"][theme_index]
            ink = color_values["ink"][theme_index]
            accent = color_values["accent"][theme_index]
            display_accent = color_values["display-accent"][theme_index]
        except (KeyError, IndexError):
            errors.append("site/codeology.css: light and dark semantic colors are required")
            break
        if contrast_ratio(ink, canvas) < 7:
            errors.append(f"site/codeology.css: {theme} ink/canvas contrast must meet AAA text contrast")
        if contrast_ratio(accent, canvas) < 4.5:
            errors.append(f"site/codeology.css: {theme} accent/canvas contrast must meet AA text contrast")
        if contrast_ratio(display_accent, canvas) < 3:
            errors.append(f"site/codeology.css: {theme} display accent must meet large-text contrast")
    if "innerHTML" in shell:
        errors.append("site/codeology-shell.js: build the source strip with DOM APIs, not innerHTML")
    if "codeology-config.json" not in shell or "codeology.css" not in shell:
        errors.append("site/codeology-shell.js: config and stylesheet must load centrally")
    if "replaceNavigation(config)" not in shell:
        errors.append("site/codeology-shell.js: shared Codeology navigation is missing")
    for contract in (
        "currentLessonPath()",
        "pinnedSourceUrl(source, path)",
        "addLessonSourceBadge(config)",
    ):
        if contract not in shell:
            errors.append(f"site/codeology-shell.js: missing lesson-source integration {contract!r}")
    if "codeology-shell.js" not in header:
        errors.append("site/header.js: Codeology shell loader is missing")
    versions = set(re.findall(r"20260812[a-z]", shell + "\n" + header))
    if len(versions) != 1:
        errors.append("site Codeology shell cache versions must match")
    return errors


def relative_luminance(hex_color: str) -> float:
    channels = [int(hex_color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [
        value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
        for value in channels
    ]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast_ratio(first: str, second: str) -> float:
    lighter, darker = sorted(
        (relative_luminance(first), relative_luminance(second)), reverse=True
    )
    return (lighter + 0.05) / (darker + 0.05)


def main() -> int:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    registry = json.loads(SOURCES.read_text(encoding="utf-8"))
    errors = audit(
        config,
        CSS.read_text(encoding="utf-8"),
        SHELL.read_text(encoding="utf-8"),
        HEADER.read_text(encoding="utf-8"),
        registry,
    )
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology brand configuration, source metadata and design tokens are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
