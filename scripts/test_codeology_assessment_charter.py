#!/usr/bin/env python3
"""Tests for the Codeology assessment-charter validator."""

from __future__ import annotations

import copy
import unittest

import validate_codeology_assessment_charter as validator


class CodeologyAssessmentCharterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.charter = validator.load_charter()
        self.html = validator.PAGE.read_text(encoding="utf-8")
        self.css = validator.CSS.read_text(encoding="utf-8")

    def test_repository_charter_and_page_pass(self) -> None:
        self.assertEqual(validator.audit_charter(self.charter), [])
        self.assertEqual(validator.audit_page(self.html, self.css, self.charter), [])

    def test_model_cannot_award_skill_state(self) -> None:
        broken = copy.deepcopy(self.charter)
        broken["decisionPolicy"]["modelMayAwardSkillState"] = True
        errors = validator.audit_charter(broken)
        self.assertTrue(any("modelMayAwardSkillState" in error for error in errors), errors)

    def test_state_order_and_ids_are_stable(self) -> None:
        broken = copy.deepcopy(self.charter)
        broken["evidenceStates"][1]["id"] = "practice"
        errors = validator.audit_charter(broken)
        self.assertTrue(any("evidenceStates ids" in error for error in errors), errors)

    def test_current_product_cannot_issue_verified(self) -> None:
        broken = copy.deepcopy(self.charter)
        broken["currentAvailability"]["highestIssuedState"] = "verified"
        errors = validator.audit_charter(broken)
        self.assertTrue(any("cap issued claims" in error for error in errors), errors)

    def test_public_definition_drift_is_rejected(self) -> None:
        broken = self.html.replace(self.charter["evidenceStates"][2]["definition"], "A project was submitted.", 1)
        errors = validator.audit_page(broken, self.css, self.charter)
        self.assertTrue(any("public copy drifted" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        broken = self.css.replace(
            ".assurance-page {\n  width: min(1180px, calc(100% - 48px));\n  margin-inline: auto;\n  padding: calc(var(--header-offset) + 16px) 0 96px;",
            ".assurance-page {\n  width: min(1180px, calc(100% - 48px));\n  margin-inline: auto;\n  padding: 80px 0 96px;",
            1,
        )
        errors = validator.audit_page(self.html, broken, self.charter)
        self.assertTrue(any("header-offset" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
