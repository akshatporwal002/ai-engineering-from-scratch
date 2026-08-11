#!/usr/bin/env python3
"""Validate the adapted Codeology glossary and its visual contracts."""

from __future__ import annotations

import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

from validate_codeology_home import audit_baselines


ROOT = Path(__file__).resolve().parent.parent
GLOSSARY = ROOT / "site" / "glossary.html"
SHELL = ROOT / "site" / "codeology-shell.js"
CSS = ROOT / "site" / "codeology.css"
BASELINES = {
    ROOT / "docs" / "visual-baselines" / "glossary-desktop-light.jpg": (1430, 993),
    ROOT / "docs" / "visual-baselines" / "glossary-mobile-dark.jpg": (380, 822),
}


class GlossaryParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.title: list[str] = []
        self.h1: list[str] = []
        self.main_count = 0
        self.description = ""
        self.canonical = ""
        self.search_contract = False
        self.live_region = False
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
        elif tag == "input" and element_id == "glossarySearch":
            self.search_contract = values.get("type") == "search" and values.get("aria-describedby") == "glossaryCount"
        if values.get("aria-live") == "polite" and values.get("aria-atomic") == "true":
            self.live_region = True
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


def audit(html: str, shell: str, css: str) -> list[str]:
    parser = GlossaryParser()
    parser.feed(html)
    errors: list[str] = []
    if normalized(parser.title) != "AI Engineering Glossary · Codeology":
        errors.append("site/glossary.html: title must identify Codeology")
    if normalized(parser.h1) != "AI Engineering Glossary":
        errors.append("site/glossary.html: imported glossary heading changed unexpectedly")
    if "Codeology" not in parser.description or "AI Engineering from Scratch" not in parser.description:
        errors.append("site/glossary.html: description must identify product and imported source")
    if parser.canonical != "glossary.html":
        errors.append("site/glossary.html: canonical must be relative to the Codeology deployment")
    if parser.main_count != 1:
        errors.append("site/glossary.html: exactly one main landmark is required")
    if not parser.search_contract or not parser.live_region:
        errors.append("site/glossary.html: accessible search and live-result contracts are required")
    for required_id in ("glossarySearch", "glossaryClear", "glossaryCategories", "glossaryAlphabet", "glossaryList", "glossaryCount"):
        if parser.ids[required_id] != 1:
            errors.append(f"site/glossary.html: requires one #{required_id}")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/glossary.html: duplicate id {element_id!r}")
    for href in parser.external_link_errors:
        errors.append(f"site/glossary.html: target=_blank link lacks rel=noopener: {href}")
    for forbidden in ('property="og:image"', 'property="og:url"', 'name="twitter:image"', "AI Engineering from Scratch · open source · free forever"):
        if forbidden in html:
            errors.append(f"site/glossary.html: inherited public metadata/branding remains active: {forbidden!r}")
    for contract in (
        "Imported reference · AI Engineering Foundations",
        "Codeology · Learn freely. Build for real. Prove what you can do.",
        "header.js",
        "cmdpalette.js",
    ):
        if contract not in html:
            errors.append(f"site/glossary.html: missing glossary contract {contract!r}")
    if not re.search(r'codeology\.css\?v=20260812[a-z]" data-codeology-style="20260812[a-z]"', html):
        errors.append("site/glossary.html: direct Codeology stylesheet contract is missing")
    for contract in (
        'html[data-product="codeology"] .glossary-page',
        "padding-block-start: calc(var(--header-offset) + 16px)",
        ".glossary-stats",
        "border-radius: var(--codeology-radius-md)",
    ):
        if contract not in css:
            errors.append(f"site/codeology.css: missing glossary design contract {contract!r}")
    if "replaceFooter(config)" not in shell:
        errors.append("site/codeology-shell.js: shared footer must use Codeology configuration")
    return errors


def main() -> int:
    errors = audit(
        GLOSSARY.read_text(encoding="utf-8"),
        SHELL.read_text(encoding="utf-8"),
        CSS.read_text(encoding="utf-8"),
    ) + audit_baselines(BASELINES)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology glossary metadata, accessibility and visual contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
