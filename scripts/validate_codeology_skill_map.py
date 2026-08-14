#!/usr/bin/env python3
"""Validate the adapted Codeology learning map and its assurance contracts."""

from __future__ import annotations

import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

from validate_codeology_home import audit_baselines


ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "site" / "prereqs.html"
SCRIPT = ROOT / "site" / "roadmap.js"
CSS = ROOT / "site" / "codeology.css"
TREE_SCRIPT = ROOT / "site" / "skill-tree-prototype.js"
TREE_CSS = ROOT / "site" / "skill-tree-prototype.css"
TREE_ENGINE = ROOT / "site" / "skill-tree-engine.js"
BASELINES = {
    ROOT / "docs" / "visual-baselines" / "skill-map-desktop-light.jpg": (1430, 993),
    ROOT / "docs" / "visual-baselines" / "skill-map-mobile-dark.jpg": (380, 822),
}


class SkillMapParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.title: list[str] = []
        self.h1: list[str] = []
        self.description = ""
        self.canonical = ""
        self.main_count = 0
        self.assurance_notes = 0
        self.external_link_errors: list[str] = []
        self._in_title = False
        self._in_h1 = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            self.ids[element_id] += 1
        if tag == "title" and not self.title:
            self._in_title = True
        elif tag == "h1":
            self._in_h1 = True
        elif tag == "main":
            self.main_count += 1
        elif tag == "meta" and values.get("name") == "description":
            self.description = values.get("content", "")
        elif tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href", "")
        if tag == "aside" and values.get("aria-label") == "Learning progress assurance":
            self.assurance_notes += 1
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


def audit(html: str, script: str, css: str, tree_script: str, tree_css: str,
          tree_engine: str | None = None) -> list[str]:
    parser = SkillMapParser()
    parser.feed(html)
    errors: list[str] = []
    if normalized(parser.title) != "AI Engineering Learning Map \u00b7 Codeology":
        errors.append("site/prereqs.html: title must identify the Codeology learning map")
    if normalized(parser.h1) != "Map your route through AI engineering.":
        errors.append("site/prereqs.html: learning-map proposition changed unexpectedly")
    if "Codeology" not in parser.description or "20 phases" not in parser.description:
        errors.append("site/prereqs.html: description must identify Codeology and pathway scope")
    if parser.canonical != "prereqs.html":
        errors.append("site/prereqs.html: canonical must be relative to the Codeology deployment")
    if parser.main_count != 1:
        errors.append("site/prereqs.html: exactly one main landmark is required")
    if parser.assurance_notes != 1:
        errors.append("site/prereqs.html: exactly one learning-progress assurance note is required")
    for element_id in (
        "roadmapTitle",
        "learningMapTitle",
        "roadmapGraph",
        "roadmapInspector",
        "roadmapGraphStatus",
        "skillTreePrototype",
        "skillTreeTitle",
        "lifeTreeGraph",
        "lifeTreeInspector",
        "lifeTreeZoomOut",
        "lifeTreeZoomIn",
        "lifeTreeReset",
        "lifeTreeZoomValue",
    ):
        if parser.ids[element_id] != 1:
            errors.append(f"site/prereqs.html: requires one #{element_id}")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/prereqs.html: duplicate id {element_id!r}")
    for href in parser.external_link_errors:
        errors.append(f"site/prereqs.html: target=_blank link lacks rel=noopener: {href}")
    for forbidden in ('property="og:image"', 'property="og:url"', 'name="twitter:image"', "va.vercel-scripts.com"):
        if forbidden in html:
            errors.append(f"site/prereqs.html: inherited metadata or analytics remains active: {forbidden!r}")
    for contract in (
        "Imported pathway \u00b7 AI Engineering Foundations",
        "Learning progress only",
        "not assessed, demonstrated, or verified skill evidence",
        "Local completions",
        "Interactive pathway map",
        "Experimental direction \u00b7 Codeology-wide skill map",
        "Concept preview",
        "illustrative sample data",
    ):
        if contract not in html:
            errors.append(f"site/prereqs.html: missing learning-map contract {contract!r}")
    if not re.search(r'codeology\.css\?v=20260814[a-z]" data-codeology-style="20260814[a-z]"', html):
        errors.append("site/prereqs.html: direct Codeology stylesheet contract is missing")

    tier_match = re.search(r"var TIER_ORDER = \[(.*?)\];\s*\n\s*var STAGES", script, re.DOTALL)
    tier_ids = [int(value) for value in re.findall(r"\d+", tier_match.group(1))] if tier_match else []
    if sorted(tier_ids) != list(range(20)) or len(tier_ids) != 20:
        errors.append("site/roadmap.js: imported graph must retain exactly phases 0 through 19")
    for contract in (
        "validateRoadmapData()",
        "window.AIFSProgress",
        "history.pushState",
        "history.replaceState",
        "escapeHtml(phase.name)",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Escape",
        "roadmap-node--' + state.key",
        "--roadmap-glow-blur:",
        "lessons marked complete in this browser",
        "return { key: 'complete', label: 'Lessons complete' }",
        "return { key: 'available', label: 'Available' }",
        "return { key: 'prerequisite', label: 'Prerequisites first' }",
    ):
        if contract not in script:
            errors.append(f"site/roadmap.js: missing interaction or assurance contract {contract!r}")
    if re.search(r"return\s*\{[^}]*label:\s*['\"](?:Demonstrated|Verified)['\"]", script, re.IGNORECASE):
        errors.append("site/roadmap.js: browser-local state must not claim demonstrated or verified skill")

    if not re.search(
        r'html\[data-product="codeology"\] \.roadmap-page\s*\{\s*padding-block-start:\s*calc\(var\(--header-offset\) \+ 16px\)',
        css,
    ):
        errors.append("site/codeology.css: learning map must clear the fixed Codeology header-offset")
    for contract in (
        ".roadmap-assurance-note",
        ".roadmap-node.has-local-progress .roadmap-node-surface",
        "filter: drop-shadow",
        ".roadmap-node--started .roadmap-node-card",
        "stroke-dasharray",
        ".roadmap-node--complete .roadmap-node-card",
        "border-radius: var(--codeology-radius-lg)",
    ):
        if contract not in css:
            errors.append(f"site/codeology.css: missing learning-map design contract {contract!r}")

    for contract in (
        "var domains = [",
        "domain('systems'",
        "domain('cyber'",
        "domain('cloud'",
        "id: 'ai'",
        "domain('backend'",
        "domain('web'",
        "domain('mobile'",
        "domain('game'",
        "domain('foundation'",
        "data-strength",
        "strengthFor(",
        "prepareAiRoadmap()",
        "typeof PHASES !== 'undefined'",
        "typeof ROADMAP_PREREQS !== 'undefined'",
        "buildAiLayout(",
        "capToCircle(",
        "life-tree-ai-phase",
        "localLessonPath(",
        "ArrowLeft",
        "ArrowRight",
        "escapeHtml(domainItem.title)",
        "setZoom(",
        "startPan(",
        "countApproximateOverlaps",
    ):
        if contract not in tree_script:
            errors.append(f"site/skill-tree-prototype.js: missing prototype contract {contract!r}")
    if re.search(r"(?:verified|demonstrated)\s+skill", tree_script, re.IGNORECASE):
        errors.append("site/skill-tree-prototype.js: sample progress must not claim verified skill")

    for contract in (
        ".life-tree-experiment",
        ".life-tree-stage",
        "#000",
        "vector-effect: non-scaling-stroke",
        ".life-tree-domain[data-strength=\"4\"]",
        ".life-tree-ai-roadmap[data-strength=\"4\"]",
        ".life-tree-ai-phase-node",
        "@media (max-width: 760px)",
        "@media (prefers-reduced-motion: reduce)",
    ):
        if contract not in tree_css:
            errors.append(f"site/skill-tree-prototype.css: missing visual contract {contract!r}")

    if tree_engine is None:
        tree_engine = TREE_ENGINE.read_text(encoding="utf-8")
    for contract in (
        "window.CodeologySkillTreeEngine",
        "layoutGraph:",
        "edgePath:",
        "validateGraph:",
        "countApproximateOverlaps:",
        "assignDepths(",
        "orderTiers(",
        "buildCentralSpine(",
        "assignLanes(",
        "onSpine:",
        "spineSway",
        "sideOffset(index, tierIndex)",
        "capToCircle(",
        "Skill graph must be acyclic",
    ):
        if contract not in tree_engine:
            errors.append(f"site/skill-tree-engine.js: missing reusable graph contract {contract!r}")
    if 'src="skill-tree-engine.js?' not in html:
        errors.append("site/prereqs.html: reusable skill-tree engine must load before the prototype")
    return errors


def main() -> int:
    errors = audit(
        PAGE.read_text(encoding="utf-8"),
        SCRIPT.read_text(encoding="utf-8"),
        CSS.read_text(encoding="utf-8"),
        TREE_SCRIPT.read_text(encoding="utf-8"),
        TREE_CSS.read_text(encoding="utf-8"),
        TREE_ENGINE.read_text(encoding="utf-8"),
    ) + audit_baselines(BASELINES)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology learning-map metadata, assurance, interaction and visual contracts are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
