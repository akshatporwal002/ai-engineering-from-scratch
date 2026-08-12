#!/usr/bin/env python3
"""Validate the dedicated Codeology credits and provenance page."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "site" / "credits.html"
CSS = ROOT / "site" / "codeology.css"
CONFIG = ROOT / "site" / "codeology-config.json"


class CreditsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.title: list[str] = []
        self.h1: list[str] = []
        self.description = ""
        self.canonical = ""
        self.main_count = 0
        self.external_link_errors: list[str] = []
        self.structured_data: list[str] = []
        self._in_title = False
        self._in_h1 = False
        self._script_target: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids[str(values["id"])] += 1
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


def audit(html: str, css: str, config: dict[str, Any]) -> list[str]:
    parser = CreditsParser()
    parser.feed(html)
    errors: list[str] = []
    source = config.get("academySource", {})
    product = config.get("product", {})

    if normalized(parser.title) != "Credits · Codeology":
        errors.append("site/credits.html: title must identify Codeology Credits")
    if normalized(parser.h1) != "Built in the open. Credited precisely.":
        errors.append("site/credits.html: credits proposition heading changed unexpectedly")
    if "Credits" not in parser.description or "source provenance" not in parser.description:
        errors.append("site/credits.html: description must explain credits and source provenance")
    if parser.canonical != "credits.html":
        errors.append("site/credits.html: canonical must be relative to the Codeology deployment")
    if parser.main_count != 1:
        errors.append("site/credits.html: exactly one main landmark is required")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/credits.html: duplicate id {element_id!r}")
    for href in parser.external_link_errors:
        errors.append(f"site/credits.html: target=_blank link lacks rel=noopener: {href}")

    baseline = str(source.get("baselineCommit", ""))
    source_url = str(source.get("url", ""))
    required = (
        str(source.get("name", "")),
        str(source.get("author", "")),
        "MIT licence",
        baseline,
        source_url,
        f"{source_url}/tree/{baseline}",
        str(product.get("repositoryUrl", "")),
        "do not sponsor or endorse Codeology",
        "Third-party notices",
    )
    for contract in required:
        if not contract or contract not in html:
            errors.append(f"site/credits.html: missing credit or provenance contract {contract!r}")

    if "codeology-source-strip" in html:
        errors.append("site/credits.html: persistent source strip must not return")
    if not re.search(r'codeology\.css\?v=20260812[a-z]" data-codeology-style="20260812[a-z]"', html):
        errors.append("site/credits.html: direct Codeology stylesheet contract is missing")
    if len(parser.structured_data) != 1:
        errors.append("site/credits.html: exactly one active JSON-LD block is required")
    else:
        try:
            structured: Any = json.loads(parser.structured_data[0])
            rendered = json.dumps(structured, sort_keys=True)
            for value in (source.get("name"), source.get("author"), baseline, "opensource.org/license/mit"):
                if str(value) not in rendered:
                    errors.append(f"site/credits.html: JSON-LD is missing {value!r}")
        except json.JSONDecodeError as exc:
            errors.append(f"site/credits.html: invalid JSON-LD: {exc}")

    if not re.search(r"\.credits-page\s*\{[^}]*padding:\s*calc\(var\(--header-offset\) \+ 16px\)", css, re.DOTALL):
        errors.append("site/codeology.css: Credits page must clear the fixed Codeology header-offset")
    for contract in (
        ".credits-hero",
        ".credits-ledger",
        ".credits-note",
        "border-radius: var(--codeology-radius-lg)",
        ".credits-action:focus-visible",
    ):
        if contract not in css:
            errors.append(f"site/codeology.css: missing Credits-page design contract {contract!r}")
    return errors


def main() -> int:
    errors = audit(
        PAGE.read_text(encoding="utf-8"),
        CSS.read_text(encoding="utf-8"),
        json.loads(CONFIG.read_text(encoding="utf-8")),
    )
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology Credits-page provenance and accessibility contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
