#!/usr/bin/env python3
"""Validate the versioned Codeology assessment charter and public assurance page."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
CHARTER = ROOT / "content" / "codeology" / "policies" / "assessment-charter.v1.json"
PAGE = ROOT / "site" / "assurance.html"
CSS = ROOT / "site" / "codeology.css"
ID_RE = re.compile(r"^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$")
STATE_IDS = ["learned", "practised", "demonstrated", "verified"]
ASSURANCE_IDS = ["learner-reported", "repository-observed", "commit-bound-reviewed", "independently-executed", "controlled-follow-up"]
IDENTITY_IDS = ["unverified", "account-linked", "identity-checked"]
ADMINISTRATION_IDS = ["self-directed", "controlled", "supervised"]
RUBRIC_IDS = ["insufficient", "developing", "competent", "strong"]


class AssuranceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: Counter[str] = Counter()
        self.title: list[str] = []
        self.h1: list[str] = []
        self.description = ""
        self.canonical = ""
        self.main_count = 0
        self.state_ids: list[str] = []
        self.availability_notes = 0
        self.decision_notes = 0
        self.external_link_errors: list[str] = []
        self.text: list[str] = []
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
        state_id = values.get("data-evidence-state")
        if state_id:
            self.state_ids.append(state_id)
        if tag == "aside" and values.get("aria-label") == "Current assessment availability":
            self.availability_notes += 1
        if tag == "aside" and values.get("aria-label") == "Assessment decision policy":
            self.decision_notes += 1
        if tag == "a" and values.get("target") == "_blank" and "noopener" not in set(values.get("rel", "").split()):
            self.external_link_errors.append(values.get("href", ""))

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


def require_string_list(value: Any, where: str, errors: list[str]) -> list[str]:
    if not isinstance(value, list) or not value or not all(isinstance(item, str) and item.strip() for item in value):
        errors.append(f"{where} must be a non-empty string array")
        return []
    return value


def ordered_ids(items: Any, where: str, expected: list[str], errors: list[str], order_field: str = "order") -> list[dict[str, Any]]:
    if not isinstance(items, list):
        errors.append(f"{where} must be an array")
        return []
    valid = [item for item in items if isinstance(item, dict)]
    if len(valid) != len(items):
        errors.append(f"{where} entries must be objects")
    ids = [item.get("id") for item in valid]
    if ids != expected:
        errors.append(f"{where} ids must equal {expected!r} in order")
    orders = [item.get(order_field) for item in valid]
    if orders != list(range(len(expected))):
        errors.append(f"{where} {order_field} values must be contiguous from zero")
    for item in valid:
        item_id = item.get("id")
        if not isinstance(item_id, str) or not ID_RE.fullmatch(item_id):
            errors.append(f"{where} contains invalid stable id {item_id!r}")
    return valid


def audit_charter(data: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["assessment charter root must be an object"]
    if data.get("schemaVersion") != 1 or data.get("policyVersion") != 1:
        errors.append("assessment charter schemaVersion and policyVersion must be 1")
    if data.get("policyId") != "codeology.assessment-charter" or data.get("status") != "active":
        errors.append("assessment charter requires stable policyId and active status")

    tool_policy = data.get("openToolPolicy")
    if not isinstance(tool_policy, dict):
        errors.append("openToolPolicy must be an object")
    else:
        allowed = require_string_list(tool_policy.get("allowed"), "openToolPolicy.allowed", errors)
        for required in ("AI coding assistants and chat companions", "editors and IDEs", "documentation and search"):
            if required not in allowed:
                errors.append(f"openToolPolicy.allowed is missing {required!r}")
        limits = require_string_list(tool_policy.get("doesNotClaim"), "openToolPolicy.doesNotClaim", errors)
        for required in ("unaided authorship", "sole authorship", "general job readiness"):
            if required not in limits:
                errors.append(f"openToolPolicy.doesNotClaim is missing {required!r}")
        if "explicitly opts in" not in str(tool_policy.get("companionPrivacy", "")):
            errors.append("openToolPolicy.companionPrivacy must keep private companion conversations outside assessment by default")

    states = ordered_ids(data.get("evidenceStates"), "evidenceStates", STATE_IDS, errors)
    for state in states:
        for field in ("label", "definition", "artifactAssuranceCeiling"):
            if not isinstance(state.get(field), str) or not state[field].strip():
                errors.append(f"evidenceStates.{state.get('id')}.{field} is required")
        require_string_list(state.get("minimumEvidence"), f"evidenceStates.{state.get('id')}.minimumEvidence", errors)
        require_string_list(state.get("cannotClaim"), f"evidenceStates.{state.get('id')}.cannotClaim", errors)
        if state.get("artifactAssuranceCeiling") not in ASSURANCE_IDS:
            errors.append(f"evidenceStates.{state.get('id')} references an unknown assurance ceiling")

    assurance = ordered_ids(data.get("artifactAssurance"), "artifactAssurance", ASSURANCE_IDS, errors, "level")
    for level in assurance:
        if not str(level.get("meaning", "")).strip():
            errors.append(f"artifactAssurance.{level.get('id')}.meaning is required")

    identity = data.get("identityAssurance")
    identity_ids = [item.get("id") for item in identity if isinstance(item, dict)] if isinstance(identity, list) else []
    if identity_ids != IDENTITY_IDS:
        errors.append(f"identityAssurance ids must equal {IDENTITY_IDS!r} in order")
    administration = data.get("administrationModes")
    administration_ids = [item.get("id") for item in administration if isinstance(item, dict)] if isinstance(administration, list) else []
    if administration_ids != ADMINISTRATION_IDS:
        errors.append(f"administrationModes ids must equal {ADMINISTRATION_IDS!r} in order")

    rubrics = ordered_ids(data.get("rubricLevels"), "rubricLevels", RUBRIC_IDS, errors)
    for level in rubrics:
        if not str(level.get("anchor", "")).strip():
            errors.append(f"rubricLevels.{level.get('id')}.anchor is required")

    decision = data.get("decisionPolicy")
    if not isinstance(decision, dict):
        errors.append("decisionPolicy must be an object")
    else:
        expected = {
            "deterministicFactsFirst": True,
            "modelMayAwardSkillState": False,
            "policyEngineDerivesSkillState": True,
            "insufficientEvidenceOutcome": "abstain-or-escalate",
        }
        for field, value in expected.items():
            if decision.get(field) != value:
                errors.append(f"decisionPolicy.{field} must equal {value!r}")
        require_string_list(decision.get("requiredProvenance"), "decisionPolicy.requiredProvenance", errors)

    availability = data.get("currentAvailability")
    if not isinstance(availability, dict) or availability.get("highestIssuedState") != "learned" or "not yet issued" not in str(availability.get("message", "")):
        errors.append("currentAvailability must cap issued claims at learned and name unavailable states")
    source = data.get("source")
    if source != {"type": "codeology", "license": "MIT"}:
        errors.append("assessment charter source must identify original Codeology MIT content")
    return errors


def audit_page(html: str, css: str, charter: dict[str, Any]) -> list[str]:
    parser = AssuranceParser()
    parser.feed(html)
    errors: list[str] = []
    if normalized(parser.title) != "Assessment and Assurance · Codeology":
        errors.append("site/assurance.html: title must identify Codeology assessment and assurance")
    if normalized(parser.h1) != "Proof needs a precise label.":
        errors.append("site/assurance.html: assurance proposition heading changed unexpectedly")
    if "learned, practised, demonstrated and verified" not in parser.description:
        errors.append("site/assurance.html: description must name all four evidence states")
    if parser.canonical != "assurance.html":
        errors.append("site/assurance.html: canonical must be relative to the Codeology deployment")
    if parser.main_count != 1:
        errors.append("site/assurance.html: exactly one main landmark is required")
    if parser.state_ids != STATE_IDS:
        errors.append(f"site/assurance.html: evidence cards must equal {STATE_IDS!r} in order")
    if parser.availability_notes != 1 or parser.decision_notes != 1:
        errors.append("site/assurance.html: availability and decision-policy notes are required")
    for element_id, count in parser.ids.items():
        if count > 1:
            errors.append(f"site/assurance.html: duplicate id {element_id!r}")
    for href in parser.external_link_errors:
        errors.append(f"site/assurance.html: target=_blank link lacks rel=noopener: {href}")
    page_text = normalized(parser.text)
    for state in charter.get("evidenceStates", []):
        for value in (state.get("label"), state.get("definition")):
            if isinstance(value, str) and value not in page_text:
                errors.append(f"site/assurance.html: public copy drifted from evidence state {state.get('id')!r}: {value!r}")
    for level in charter.get("rubricLevels", []):
        for value in (level.get("label"), level.get("anchor")):
            if isinstance(value, str) and value not in page_text:
                errors.append(f"site/assurance.html: public copy drifted from rubric level {level.get('id')!r}: {value!r}")
    for contract in (
        charter.get("currentAvailability", {}).get("message", ""),
        "Models may produce bounded criterion judgments, but they never directly award a skill state.",
        "Unaided or sole authorship",
        "General job readiness",
    ):
        if contract and contract not in page_text:
            errors.append(f"site/assurance.html: missing assurance limit {contract!r}")
    if not re.search(r'codeology\.css\?v=20260812[a-z]" data-codeology-style="20260812[a-z]"', html):
        errors.append("site/assurance.html: direct Codeology stylesheet contract is missing")
    if not re.search(r"\.assurance-page\s*\{[^}]*padding:\s*calc\(var\(--header-offset\) \+ 16px\)", css, re.DOTALL):
        errors.append("site/codeology.css: assurance page must clear the fixed Codeology header-offset")
    for contract in (
        ".assurance-state-grid",
        ".assurance-state[data-evidence-state=\"verified\"]",
        ".assurance-open-tool",
        ".assurance-axis-grid",
        ".assurance-rubric",
        "border-radius: var(--codeology-radius-lg)",
    ):
        if contract not in css:
            errors.append(f"site/codeology.css: missing assurance design contract {contract!r}")
    return errors


def load_charter(path: Path = CHARTER) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("assessment charter root must be an object")
    return data


def main() -> int:
    try:
        charter = load_charter()
        errors = audit_charter(charter) + audit_page(PAGE.read_text(encoding="utf-8"), CSS.read_text(encoding="utf-8"), charter)
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
        errors = [f"assessment charter could not be loaded: {exc}"]
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Codeology assessment charter, assurance states and public policy page are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
