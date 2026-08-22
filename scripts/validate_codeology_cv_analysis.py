#!/usr/bin/env python3
"""Validate the local-first Codeology CV Analysis product contract."""

from __future__ import annotations

import json
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "site" / "cv-analysis.html"
ENGINE = ROOT / "site" / "cv-analysis-engine.js"
UI = ROOT / "site" / "cv-analysis.js"
CSS = ROOT / "site" / "codeology.css"
CONFIG = ROOT / "site" / "codeology-config.json"
DOC = ROOT / "docs" / "CODEOLOGY_CV_ANALYSIS_MIGRATION.md"


class CVAnalysisParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.title: list[str] = []
        self.h1: list[str] = []
        self.text: list[str] = []
        self.canonical = ""
        self.main_count = 0
        self.form_count = 0
        self.scripts: list[str] = []
        self.controls: dict[str, dict[str, str | None]] = {}
        self._in_title = False
        self._in_h1 = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            self.ids[element_id] += 1
            if tag in {"input", "select", "textarea", "button", "form"}:
                self.controls[element_id] = values
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._in_h1 = True
        elif tag == "main":
            self.main_count += 1
        elif tag == "form":
            self.form_count += 1
        elif tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href", "") or ""
        elif tag == "script" and values.get("src"):
            self.scripts.append((values.get("src") or "").split("?")[0])

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self._in_h1 = False

    def handle_data(self, data: str) -> None:
        self.text.append(data)
        if self._in_title:
            self.title.append(data)
        if self._in_h1:
            self.h1.append(data)


def normalized(parts: list[str]) -> str:
    return " ".join("".join(parts).split())


def audit(page: str, engine: str, ui: str, css: str, config: dict[str, Any], documentation: str) -> list[str]:
    parser = CVAnalysisParser()
    parser.feed(page)
    errors: list[str] = []

    if normalized(parser.title) != "CV Analysis · Codeology":
        errors.append("site/cv-analysis.html: title must identify Codeology CV Analysis")
    if normalized(parser.h1) != "Turn your CV into a learning map.":
        errors.append("site/cv-analysis.html: product proposition heading changed unexpectedly")
    if parser.canonical != "cv-analysis.html":
        errors.append("site/cv-analysis.html: canonical must be a relative Codeology route")
    if parser.main_count != 1 or parser.form_count != 1:
        errors.append("site/cv-analysis.html: exactly one main landmark and one form are required")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/cv-analysis.html: duplicate id {element_id!r}")

    required_ids = {
        "cvAnalysisForm", "targetRole", "jobDescription", "cvText", "cvFile",
        "cvFormStatus", "cvClearButton", "cvResults", "cvResultsTitle",
        "cvRoleAreas", "cvSignals", "cvEditPrompts", "cvLessonList",
    }
    for element_id in sorted(required_ids - parser.ids.keys()):
        errors.append(f"site/cv-analysis.html: missing required id {element_id!r}")

    target = parser.controls.get("targetRole", {})
    cv_text = parser.controls.get("cvText", {})
    file_control = parser.controls.get("cvFile", {})
    if "required" not in target or "required" not in cv_text:
        errors.append("site/cv-analysis.html: target role and CV text must be required")
    if cv_text.get("maxlength") != "50000" or cv_text.get("minlength") != "120":
        errors.append("site/cv-analysis.html: CV text limits must remain 120..50000 characters")
    accepted = (file_control.get("accept") or "").lower()
    if ".txt" not in accepted or ".md" not in accepted or "pdf" in accepted or "word" in accepted or ".doc" in accepted:
        errors.append("site/cv-analysis.html: local files must be TXT/MD only")

    for script in ("data.js", "cv-analysis-engine.js", "cv-analysis.js", "header.js"):
        if script not in parser.scripts:
            errors.append(f"site/cv-analysis.html: missing script {script!r}")

    text = normalized(parser.text).lower()
    required_copy = (
        "stays in your browser",
        "does not upload, save, log, or send your cv",
        "no employability score",
        "formative guidance only",
        "does not establish identity, authorship, competence, seniority, job readiness",
    )
    for phrase in required_copy:
        if phrase not in text:
            errors.append(f"site/cv-analysis.html: missing privacy or claim boundary {phrase!r}")

    forbidden_runtime = ("fetch(", "xmlhttprequest", "websocket", "sendbeacon", "localstorage", "sessionstorage")
    combined_runtime = (engine + "\n" + ui).lower()
    for marker in forbidden_runtime:
        if marker in combined_runtime:
            errors.append(f"CV analysis runtime must not use network or persistent storage marker {marker!r}")
    for contract in ("formative-local", "transmitted: false", "persisted: false", "claimsJobReadiness: false"):
        if contract not in engine:
            errors.append(f"site/cv-analysis-engine.js: missing policy contract {contract!r}")
    if "textContent" not in ui or "innerHTML" in ui:
        errors.append("site/cv-analysis.js: results must render through textContent-safe DOM construction")

    navigation = config.get("product", {}).get("navigation", [])
    matches = [item for item in navigation if isinstance(item, dict) and item.get("href") == "cv-analysis.html"]
    if matches != [{"label": "CV Analysis", "href": "cv-analysis.html"}]:
        errors.append("site/codeology-config.json: navigation requires one CV Analysis route")

    for selector in (".cv-analysis-page", ".cv-analysis-hero", ".cv-analysis-form", ".cv-role-area-grid", ".cv-result-boundary"):
        if selector not in css:
            errors.append(f"site/codeology.css: missing CV Analysis selector {selector!r}")
    if "@media (max-width: 700px)" not in css or ".cv-analysis-page" not in css.split("@media (max-width: 700px)", 1)[1]:
        errors.append("site/codeology.css: CV Analysis mobile rules are required")

    for phrase in (
        "d1aecc127b2a16567b1fe78461f81a50f8b04202",
        "No explicit licence file was found",
        "does not copy source code or visual assets",
        "Later server-assisted phase",
        "never log document text",
    ):
        if phrase not in documentation:
            errors.append(f"CV Analysis migration documentation is missing {phrase!r}")
    return errors


def main() -> int:
    errors = audit(
        PAGE.read_text(encoding="utf-8"),
        ENGINE.read_text(encoding="utf-8"),
        UI.read_text(encoding="utf-8"),
        CSS.read_text(encoding="utf-8"),
        json.loads(CONFIG.read_text(encoding="utf-8")),
        DOC.read_text(encoding="utf-8"),
    )
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology CV Analysis privacy, UI, navigation and migration contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
