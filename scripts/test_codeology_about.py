#!/usr/bin/env python3
"""Tests for the Codeology About-page validator."""

from __future__ import annotations

import unittest

import validate_codeology_about as validator


class CodeologyAboutTest(unittest.TestCase):
    def setUp(self) -> None:
        self.html = validator.PAGE.read_text(encoding="utf-8")
        self.css = validator.CSS.read_text(encoding="utf-8")

    def test_repository_about_page_passes(self) -> None:
        self.assertEqual(validator.audit(self.html, self.css), [])

    def test_missing_source_card_is_rejected(self) -> None:
        broken = self.html.replace('aria-label="AI Engineering Foundations source"', 'aria-label="Source"', 1)
        errors = validator.audit(broken, self.css)
        self.assertTrue(any("source card" in error for error in errors), errors)

    def test_missing_non_endorsement_is_rejected(self) -> None:
        broken = self.html.replace("The original project does not sponsor or endorse Codeology", "Independent adaptation", 1)
        errors = validator.audit(broken, self.css)
        self.assertTrue(any("sponsor or endorse" in error for error in errors), errors)

    def test_upstream_canonical_is_rejected(self) -> None:
        broken = self.html.replace('href="about.html"', 'href="https://aiengineeringfromscratch.com/about.html"', 1)
        errors = validator.audit(broken, self.css)
        self.assertTrue(any("canonical" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        broken = self.css.replace(
            "padding: calc(var(--header-offset) + 16px) 0 96px;",
            "padding: 80px 0 96px;",
            1,
        )
        errors = validator.audit(self.html, broken)
        self.assertTrue(any("header-offset" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
