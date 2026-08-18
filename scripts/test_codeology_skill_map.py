#!/usr/bin/env python3
"""Tests for the Codeology learning-map validator."""

from __future__ import annotations

import unittest

import validate_codeology_skill_map as validator


class CodeologySkillMapTest(unittest.TestCase):
    def setUp(self) -> None:
        self.html = validator.PAGE.read_text(encoding="utf-8")
        self.script = validator.SCRIPT.read_text(encoding="utf-8")
        self.css = validator.CSS.read_text(encoding="utf-8")

    def test_repository_learning_map_passes(self) -> None:
        self.assertEqual(validator.audit(self.html, self.script, self.css), [])
        self.assertEqual(validator.audit_baselines(validator.BASELINES), [])

    def test_missing_assurance_note_is_rejected(self) -> None:
        broken = self.html.replace('aria-label="Learning progress assurance"', 'aria-label="Progress"', 1)
        errors = validator.audit(broken, self.script, self.css)
        self.assertTrue(any("assurance note" in error for error in errors), errors)

    def test_verified_local_state_is_rejected(self) -> None:
        broken = self.script.replace("label: 'Lessons complete'", "label: 'Verified'", 1)
        errors = validator.audit(self.html, broken, self.css)
        self.assertTrue(any("verified skill" in error for error in errors), errors)

    def test_graph_phase_loss_is_rejected(self) -> None:
        broken = self.script.replace("[16, 18]", "[16]", 1)
        errors = validator.audit(self.html, broken, self.css)
        self.assertTrue(any("phases 0 through 19" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        broken = self.css.replace(
            'html[data-product="codeology"] .roadmap-page {\n  padding-block-start: calc(var(--header-offset) + 16px);',
            'html[data-product="codeology"] .roadmap-page {\n  padding-block-start: 80px;',
            1,
        )
        errors = validator.audit(self.html, self.script, broken)
        self.assertTrue(any("header-offset" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
