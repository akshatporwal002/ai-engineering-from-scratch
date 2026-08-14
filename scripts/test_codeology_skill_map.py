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
        self.tree_script = validator.TREE_SCRIPT.read_text(encoding="utf-8")
        self.tree_css = validator.TREE_CSS.read_text(encoding="utf-8")

    def audit(self, html: str | None = None, script: str | None = None, css: str | None = None,
              tree_script: str | None = None, tree_css: str | None = None) -> list[str]:
        return validator.audit(
            self.html if html is None else html,
            self.script if script is None else script,
            self.css if css is None else css,
            self.tree_script if tree_script is None else tree_script,
            self.tree_css if tree_css is None else tree_css,
        )

    def test_repository_learning_map_passes(self) -> None:
        self.assertEqual(self.audit(), [])
        self.assertEqual(validator.audit_baselines(validator.BASELINES), [])

    def test_missing_assurance_note_is_rejected(self) -> None:
        broken = self.html.replace('aria-label="Learning progress assurance"', 'aria-label="Progress"', 1)
        errors = self.audit(html=broken)
        self.assertTrue(any("assurance note" in error for error in errors), errors)

    def test_verified_local_state_is_rejected(self) -> None:
        broken = self.script.replace("label: 'Lessons complete'", "label: 'Verified'", 1)
        errors = self.audit(script=broken)
        self.assertTrue(any("verified skill" in error for error in errors), errors)

    def test_graph_phase_loss_is_rejected(self) -> None:
        broken = self.script.replace("[16, 18]", "[16]", 1)
        errors = self.audit(script=broken)
        self.assertTrue(any("phases 0 through 19" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        broken = self.css.replace(
            'html[data-product="codeology"] .roadmap-page {\n  padding-block-start: calc(var(--header-offset) + 16px);',
            'html[data-product="codeology"] .roadmap-page {\n  padding-block-start: 80px;',
            1,
        )
        errors = self.audit(css=broken)
        self.assertTrue(any("header-offset" in error for error in errors), errors)

    def test_missing_tree_domain_is_rejected(self) -> None:
        broken = self.tree_script.replace("id: 'game'", "id: 'interactive-media'", 1)
        errors = self.audit(tree_script=broken)
        self.assertTrue(any("prototype contract" in error for error in errors), errors)

    def test_missing_reduced_motion_contract_is_rejected(self) -> None:
        broken = self.tree_css.replace("@media (prefers-reduced-motion: reduce)", "@media (min-width: 9999px)", 1)
        errors = self.audit(tree_css=broken)
        self.assertTrue(any("reduced-motion" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
