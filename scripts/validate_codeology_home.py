#!/usr/bin/env python3
"""Validate the Codeology homepage proposition and accessibility contracts."""

from __future__ import annotations

import json
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
HOME = ROOT / "site" / "index.html"
BASELINES = {
    ROOT / "docs" / "visual-baselines" / "homepage-desktop-light.jpg": (1430, 993),
    ROOT / "docs" / "visual-baselines" / "homepage-mobile-dark.jpg": (380, 822),
}


class HomeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.fragment_links: list[str] = []
        self.external_link_errors: list[str] = []
        self.title_parts: list[str] = []
        self.h1_parts: list[list[str]] = []
        self.description = ""
        self.main_count = 0
        self.loop_step_count = 0
        self.loop_label = ""
        self.social_proof_hidden = False
        self.active_structured_data: list[str] = []
        self.imported_metadata: list[str] = []
        self._in_title = False
        self._h1_depth = 0
        self._script_target: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        classes = set(values.get("class", "").split())
        element_id = values.get("id")
        if element_id:
            self.ids[element_id] += 1
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._h1_depth += 1
            self.h1_parts.append([])
        elif tag == "br" and self._h1_depth and self.h1_parts:
            self.h1_parts[-1].append(" ")
        elif tag == "main":
            self.main_count += 1
        elif tag == "meta" and values.get("name") == "description":
            self.description = values.get("content", "")
        elif tag == "a":
            href = values.get("href", "")
            if href.startswith("#") and len(href) > 1:
                self.fragment_links.append(href[1:])
            if values.get("target") == "_blank":
                rel = set(values.get("rel", "").split())
                if "noopener" not in rel:
                    self.external_link_errors.append(href)
        elif "codeology-loop-step" in classes:
            self.loop_step_count += 1
        elif element_id == "codeology-loop":
            self.loop_label = values.get("aria-label", "")
        elif tag == "section" and "learners-strip" in classes:
            self.social_proof_hidden = "hidden" in values
        elif tag == "script":
            if values.get("type") == "application/ld+json":
                self.active_structured_data.append("")
                self._script_target = self.active_structured_data
            elif values.get("data-imported-metadata") == "ai-engineering-from-scratch":
                self.imported_metadata.append("")
                self._script_target = self.imported_metadata

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "h1" and self._h1_depth:
            self._h1_depth -= 1
        elif tag == "script":
            self._script_target = None

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data)
        if self._h1_depth and self.h1_parts:
            self.h1_parts[-1].append(data)
        if self._script_target is not None:
            self._script_target[-1] += data


def normalized(parts: list[str]) -> str:
    return " ".join("".join(parts).split())


def audit(html: str) -> list[str]:
    parser = HomeParser()
    parser.feed(html)
    errors: list[str] = []
    title = normalized(parser.title_parts)
    headings = [normalized(parts) for parts in parser.h1_parts]
    if not title.startswith("Codeology"):
        errors.append("site/index.html: title must lead with Codeology")
    if "Codeology" not in parser.description or "own environment" not in parser.description:
        errors.append("site/index.html: description must state the Codeology open-tool proposition")
    if parser.main_count != 1:
        errors.append("site/index.html: exactly one main landmark is required")
    if headings != ["Learn freely. Build for real."]:
        errors.append("site/index.html: homepage requires one Codeology proposition h1")
    if parser.loop_step_count != 3:
        errors.append("site/index.html: learn/build/prove loop must contain exactly three steps")
    if not parser.loop_label:
        errors.append("site/index.html: evidence loop needs an accessible label")
    if not parser.social_proof_hidden:
        errors.append("site/index.html: inherited social-proof marketing must remain hidden")
    for target in parser.fragment_links:
        if parser.ids[target] == 0:
            errors.append(f"site/index.html: fragment link targets missing id #{target}")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/index.html: duplicate id {element_id!r}")
    for href in parser.external_link_errors:
        errors.append(f"site/index.html: target=_blank link lacks rel=noopener: {href}")
    if '<link rel="canonical" href="https://aiengineeringfromscratch.com/' in html:
        errors.append("site/index.html: canonical metadata must not claim the upstream domain")
    if len(parser.active_structured_data) != 1:
        errors.append("site/index.html: exactly one active JSON-LD block is required")
    else:
        try:
            structured: Any = json.loads(parser.active_structured_data[0])
            rendered = json.dumps(structured, sort_keys=True)
            for required in ("Codeology", "AI Engineering Foundations", "rohitg00"):
                if required not in rendered:
                    errors.append(f"site/index.html: JSON-LD is missing {required!r}")
        except json.JSONDecodeError as exc:
            errors.append(f"site/index.html: invalid JSON-LD: {exc}")
    if len(parser.imported_metadata) != 1:
        errors.append("site/index.html: imported upstream metadata must remain inert and traceable")
    required_copy = (
        "Use your own tools and AI companions",
        "Codeology assesses the work",
        "immutable commit",
        "Featured free pathway",
        "AI Engineering Foundations",
    )
    for phrase in required_copy:
        if phrase not in html:
            errors.append(f"site/index.html: missing product copy {phrase!r}")
    return errors


def jpeg_dimensions(data: bytes) -> tuple[int, int]:
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        raise ValueError("not a JPEG image")
    offset = 2
    start_of_frame = {
        0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
        0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
    }
    while offset + 9 <= len(data):
        if data[offset] != 0xFF:
            offset += 1
            continue
        marker = data[offset + 1]
        if marker in start_of_frame:
            height = int.from_bytes(data[offset + 5:offset + 7], "big")
            width = int.from_bytes(data[offset + 7:offset + 9], "big")
            return width, height
        if marker in {0xD8, 0xD9}:
            offset += 2
            continue
        segment_length = int.from_bytes(data[offset + 2:offset + 4], "big")
        if segment_length < 2:
            break
        offset += 2 + segment_length
    raise ValueError("JPEG dimensions are unavailable")


def audit_baselines(baselines: dict[Path, tuple[int, int]] = BASELINES) -> list[str]:
    errors: list[str] = []
    for path, expected in baselines.items():
        try:
            relative = path.relative_to(ROOT).as_posix()
        except ValueError:
            relative = path.as_posix()
        try:
            actual = jpeg_dimensions(path.read_bytes())
        except (FileNotFoundError, ValueError) as exc:
            errors.append(f"{relative}: invalid or missing visual baseline ({exc})")
            continue
        if actual != expected:
            errors.append(f"{relative}: expected {expected[0]}x{expected[1]}, found {actual[0]}x{actual[1]}")
    return errors


def main() -> int:
    errors = audit(HOME.read_text(encoding="utf-8")) + audit_baselines()
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology homepage proposition and accessibility contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
