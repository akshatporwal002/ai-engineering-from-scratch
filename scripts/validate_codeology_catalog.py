#!/usr/bin/env python3
"""Validate the adapted Codeology lesson catalog and visual contracts."""

from __future__ import annotations

import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

from validate_codeology_home import audit_baselines


ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "site" / "catalog.html"
CSS = ROOT / "site" / "codeology.css"
BASELINES = {
    ROOT / "docs" / "visual-baselines" / "catalog-desktop-light.jpg": (1430, 993),
    ROOT / "docs" / "visual-baselines" / "catalog-mobile-dark.jpg": (380, 822),
}


class CatalogParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.title: list[str] = []
        self.h1: list[str] = []
        self.description = ""
        self.canonical = ""
        self.main_count = 0
        self.sort_headers = 0
        self.external_link_errors: list[str] = []
        self._in_title = False
        self._in_h1 = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            self.ids[element_id] += 1
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._in_h1 = True
        elif tag == "main":
            self.main_count += 1
        elif tag == "meta" and values.get("name") == "description":
            self.description = values.get("content", "")
        elif tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href", "")
        elif tag == "th" and values.get("data-sort"):
            if values.get("scope") == "col" and values.get("tabindex") == "0" and values.get("aria-sort"):
                self.sort_headers += 1
        if tag == "a" and values.get("target") == "_blank" and "noopener" not in set(values.get("rel", "").split()):
            self.external_link_errors.append(values.get("href", ""))

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self._in_h1 = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title.append(data)
        if self._in_h1:
            self.h1.append(data)


def normalized(parts: list[str]) -> str:
    return " ".join("".join(parts).split())


def audit(html: str, css: str) -> list[str]:
    parser = CatalogParser()
    parser.feed(html)
    errors: list[str] = []
    if normalized(parser.title) != "AI Engineering Lesson Catalog · Codeology":
        errors.append("site/catalog.html: title must identify Codeology")
    if normalized(parser.h1) != "Lesson Catalog":
        errors.append("site/catalog.html: imported catalog heading changed unexpectedly")
    if "Codeology" not in parser.description or "AI Engineering from Scratch" not in parser.description:
        errors.append("site/catalog.html: description must identify product and imported source")
    if parser.canonical != "catalog.html":
        errors.append("site/catalog.html: canonical must be relative to the Codeology deployment")
    if parser.main_count != 1:
        errors.append("site/catalog.html: exactly one main landmark is required")
    if parser.sort_headers != 5:
        errors.append("site/catalog.html: five keyboard-sortable column headers are required")
    for required_id in ("catalogSearch", "catalogPhase", "catalogStatus", "catalogCount", "catalogTable", "catalogBody"):
        if parser.ids[required_id] != 1:
            errors.append(f"site/catalog.html: requires one #{required_id}")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/catalog.html: duplicate id {element_id!r}")
    for href in parser.external_link_errors:
        errors.append(f"site/catalog.html: target=_blank link lacks rel=noopener: {href}")
    for forbidden in ('property="og:image"', 'property="og:url"', 'name="twitter:image"', "AI Engineering from Scratch · open source · free forever"):
        if forbidden in html:
            errors.append(f"site/catalog.html: inherited public metadata/branding remains active: {forbidden!r}")
    for contract in (
        "Imported pathway · AI Engineering Foundations",
        "Every free lesson across all 20 phases. Search, filter, sort.",
        'id="catalogCount" role="status" aria-live="polite"',
        "history.replaceState",
        "escapeHtml(r.name)",
        "header.js",
        "cmdpalette.js",
    ):
        if contract not in html:
            errors.append(f"site/catalog.html: missing catalog contract {contract!r}")
    if not re.search(r'codeology\.css\?v=20260814[a-z]" data-codeology-style="20260814[a-z]"', html):
        errors.append("site/catalog.html: direct Codeology stylesheet contract is missing")
    if not re.search(
        r'html\[data-product="codeology"\] \.catalog-page\s*\{\s*padding-block-start:\s*calc\(var\(--header-offset\) \+ 16px\)',
        css,
    ):
        errors.append("site/codeology.css: catalog page must clear the fixed Codeology header-offset")
    for contract in (
        'html[data-product="codeology"] .catalog-search',
        "border-radius: var(--codeology-radius-sm)",
        'html[data-product="codeology"] .catalog-table-wrap',
    ):
        if contract not in css:
            errors.append(f"site/codeology.css: missing catalog design contract {contract!r}")
    return errors


def main() -> int:
    errors = audit(
        CATALOG.read_text(encoding="utf-8"),
        CSS.read_text(encoding="utf-8"),
    ) + audit_baselines(BASELINES)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology catalog metadata, accessibility and visual contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
