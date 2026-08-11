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
    for field in ("sourceId", "name", "author", "url", "license", "baselineCommit"):
        if not str(source.get(field, "")).strip():
            errors.append(f"site/codeology-config.json: academySource.{field} is required")
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
    if "innerHTML" in shell:
        errors.append("site/codeology-shell.js: build the source strip with DOM APIs, not innerHTML")
    if "codeology-config.json" not in shell or "codeology.css" not in shell:
        errors.append("site/codeology-shell.js: config and stylesheet must load centrally")
    if "codeology-shell.js" not in header:
        errors.append("site/header.js: Codeology shell loader is missing")
    return errors


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
