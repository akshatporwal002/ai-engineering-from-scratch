#!/usr/bin/env python3
"""Validate Codeology's About page and public product claims."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "site" / "about.html"
CSS = ROOT / "site" / "codeology.css"
class AboutParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.title: list[str] = []
        self.h1: list[str] = []
        self.description = ""
        self.canonical = ""
        self.main_count = 0
        self.credits_links = 0
        self.external_link_errors: list[str] = []
        self.structured_data: list[str] = []
        self._in_title = False
        self._in_h1 = False
        self._script_target: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            self.ids[element_id] += 1
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._in_h1 = True
        elif tag == "br" and self._in_h1:
            self.h1.append(" ")
        elif tag == "main":
            self.main_count += 1
        elif tag == "meta" and values.get("name") == "description":
            self.description = values.get("content", "")
        elif tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href", "")
        elif tag == "a" and values.get("href") == "credits.html":
            self.credits_links += 1
        elif tag == "script" and values.get("type") == "application/ld+json":
            self.structured_data.append("")
            self._script_target = self.structured_data
        if tag == "a" and values.get("target") == "_blank" and "noopener" not in set(values.get("rel", "").split()):
            self.external_link_errors.append(values.get("href", ""))

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self._in_h1 = False
        elif tag == "script":
            self._script_target = None

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title.append(data)
        if self._in_h1:
            self.h1.append(data)
        if self._script_target is not None:
            self._script_target[-1] += data


def normalized(parts: list[str]) -> str:
    return " ".join("".join(parts).split())


def audit(html: str, css: str) -> list[str]:
    parser = AboutParser()
    parser.feed(html)
    errors: list[str] = []
    if normalized(parser.title) != "About Codeology":
        errors.append("site/about.html: title must identify Codeology")
    if normalized(parser.h1) != "Learn the foundations. Prove the work.":
        errors.append("site/about.html: Codeology proposition heading changed unexpectedly")
    if "Codeology" not in parser.description or "open-tool" not in parser.description:
        errors.append("site/about.html: description must state the Codeology open-tool proposition")
    if parser.canonical != "about.html":
        errors.append("site/about.html: canonical must be relative to the Codeology deployment")
    if parser.main_count != 1:
        errors.append("site/about.html: exactly one main landmark is required")
    if parser.credits_links != 1:
        errors.append("site/about.html: exactly one link to the dedicated Credits page is required")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/about.html: duplicate id {element_id!r}")
    for href in parser.external_link_errors:
        errors.append(f"site/about.html: target=_blank link lacks rel=noopener: {href}")
    for forbidden in (
        'property="og:image"',
        'property="og:url"',
        'name="twitter:image"',
        "va.vercel-scripts.com",
        "It is hosted on Vercel",
        "There is no token, no course upsell",
    ):
        if forbidden in html:
            errors.append(f"site/about.html: inherited marketing or metadata remains active: {forbidden!r}")
    for contract in (
        "free, open-tool engineering academy",
        "Use your own editor, compute, documentation and AI companions",
        "Evidence before badges",
        "browser-local activity is not an employment credential",
        "Full authorship, licence and immutable source details are maintained in one place",
        "View credits and provenance",
    ):
        if contract not in html:
            errors.append(f"site/about.html: missing product or attribution contract {contract!r}")
    if not re.search(r'codeology\.css\?v=20260812[a-z]" data-codeology-style="20260812[a-z]"', html):
        errors.append("site/about.html: direct Codeology stylesheet contract is missing")
    if len(parser.structured_data) != 1:
        errors.append("site/about.html: exactly one active JSON-LD block is required")
    else:
        try:
            structured: Any = json.loads(parser.structured_data[0])
            rendered = json.dumps(structured, sort_keys=True)
            for required in ("About Codeology", "Codeology", "AI Engineering from Scratch", "opensource.org/license/mit"):
                if required not in rendered:
                    errors.append(f"site/about.html: JSON-LD is missing {required!r}")
        except json.JSONDecodeError as exc:
            errors.append(f"site/about.html: invalid JSON-LD: {exc}")
    if not re.search(
        r"\.about-page\s*\{[^}]*padding:\s*calc\(var\(--header-offset\) \+ 16px\)",
        css,
        re.DOTALL,
    ):
        errors.append("site/codeology.css: About page must clear the fixed Codeology header-offset")
    for contract in (
        ".about-hero",
        ".about-principles",
        "border-radius: var(--codeology-radius-lg)",
        ".about-action:focus-visible",
    ):
        if contract not in css:
            errors.append(f"site/codeology.css: missing About-page design contract {contract!r}")
    return errors


def main() -> int:
    errors = audit(PAGE.read_text(encoding="utf-8"), CSS.read_text(encoding="utf-8"))
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology About-page product, attribution and accessibility contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
