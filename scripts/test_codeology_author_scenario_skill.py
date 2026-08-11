#!/usr/bin/env python3
"""Contract tests for the Codeology scenario-authoring maintainer skill."""

from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SKILL_ROOT = ROOT / ".agents" / "skills" / "codeology-author-scenario"


class CodeologyScenarioAuthoringSkillTest(unittest.TestCase):
    def setUp(self) -> None:
        self.skill = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
        self.contract = (SKILL_ROOT / "references" / "scenario-contract.md").read_text(encoding="utf-8")

    def test_skill_requires_job_task_evidence_before_competencies(self) -> None:
        self.assertIn("completed, cited job-task analysis", self.skill)
        self.assertIn("Stop instead of inventing competencies", self.skill)
        self.assertIn("status: draft", self.contract)

    def test_skill_uses_authoritative_public_contracts(self) -> None:
        for contract in (
            "docs/CODEOLOGY_CONTENT_SCHEMA.md",
            "job-task-analysis.schema.json",
            "scenario.schema.json",
            "rubric.schema.json",
            "skill.schema.json",
            "pathway.schema.json",
            "assessment-charter.v1.json",
        ):
            self.assertIn(contract, self.skill + self.contract)

    def test_public_and_assessor_material_are_separated(self) -> None:
        for forbidden in ("hidden tests", "private grader", "calibration answers", "escalation thresholds"):
            self.assertIn(forbidden, self.contract)
        self.assertIn("separate access-controlled root", self.contract)
        self.assertIn("Do not create one opportunistically", self.contract)

    def test_learner_checks_cannot_raise_assurance(self) -> None:
        self.assertIn("learner-controlled practice evidence", self.skill)
        self.assertIn("assuranceCeiling` to `repository-observed", self.contract)
        self.assertIn("wording alone cannot raise assurance", self.contract)

    def test_mapping_and_immutable_version_rules_are_explicit(self) -> None:
        self.assertIn("exact versioned references in both directions", self.skill)
        self.assertIn("Never mutate a published version", self.skill)
        self.assertIn("scenario mappings and rubric skill references identical", self.contract)

    def test_manual_pilot_has_reproducibility_and_comprehension_gates(self) -> None:
        for gate in (
            "clean checkout",
            "without staff interpretation",
            "non-reference implementation",
            "failure feedback is actionable",
            "stated time and hardware envelope",
        ):
            self.assertIn(gate, self.contract)

    def test_required_validation_commands_are_present(self) -> None:
        for command in (
            "npm run check:codeology-content",
            "npm run check:provenance",
            "npm run ci",
        ):
            self.assertIn(command, self.skill + self.contract)


if __name__ == "__main__":
    unittest.main()
