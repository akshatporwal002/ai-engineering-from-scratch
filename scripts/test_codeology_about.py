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

    def test_missing_credits_link_is_rejected(self) -> None:
        broken = self.html.replace('href="credits.html"', 'href="about.html#credits"', 1)
        errors = validator.audit(broken, self.css)
        self.assertTrue(any("Credits page" in error for error in errors), errors)

    def test_missing_central_provenance_message_is_rejected(self) -> None:
        broken = self.html.replace("Full authorship, licence and immutable source details are maintained in one place", "See details", 1)
        errors = validator.audit(broken, self.css)
        self.assertTrue(any("Full authorship" in error for error in errors), errors)

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
