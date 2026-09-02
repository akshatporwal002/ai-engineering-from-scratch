#!/usr/bin/env python3
"""Tests for the Codeology Credits-page validator."""

from __future__ import annotations

import json
import unittest

import validate_codeology_credits as validator


class CodeologyCreditsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.html = validator.PAGE.read_text(encoding="utf-8")
        self.css = validator.CSS.read_text(encoding="utf-8")
        self.config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))

    def test_repository_credits_page_passes(self) -> None:
        self.assertEqual(validator.audit(self.html, self.css, self.config), [])

    def test_source_author_drift_is_rejected(self) -> None:
        broken = self.html.replace("Rohit Ghumare and contributors", "Unknown contributors")
        errors = validator.audit(broken, self.css, self.config)
        self.assertTrue(any("Rohit Ghumare" in error for error in errors), errors)

    def test_missing_non_endorsement_is_rejected(self) -> None:
        broken = self.html.replace("do not sponsor or endorse Codeology", "are independent")
        errors = validator.audit(broken, self.css, self.config)
        self.assertTrue(any("sponsor or endorse" in error for error in errors), errors)

    def test_external_link_without_noopener_is_rejected(self) -> None:
        broken = self.html.replace('target="_blank" rel="noopener"', 'target="_blank"', 1)
        errors = validator.audit(broken, self.css, self.config)
        self.assertTrue(any("rel=noopener" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        broken = self.css.replace(
            ".credits-page {\n  display: grid;\n  width: min(1120px, calc(100% - 48px));\n  margin-inline: auto;\n  padding: calc(var(--header-offset) + 16px) 0 112px;",
            ".credits-page {\n  display: grid;\n  width: min(1120px, calc(100% - 48px));\n  margin-inline: auto;\n  padding: 80px 0 112px;",
            1,
        )
        errors = validator.audit(self.html, broken, self.config)
        self.assertTrue(any("header-offset" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
