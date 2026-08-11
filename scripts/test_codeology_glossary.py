#!/usr/bin/env python3
"""Tests for the Codeology glossary validator."""

from __future__ import annotations

import unittest

import validate_codeology_glossary as validator


class CodeologyGlossaryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.html = validator.GLOSSARY.read_text(encoding="utf-8")
        self.shell = validator.SHELL.read_text(encoding="utf-8")
        self.css = validator.CSS.read_text(encoding="utf-8")

    def test_repository_glossary_passes(self) -> None:
        self.assertEqual(validator.audit(self.html, self.shell, self.css), [])

    def test_upstream_canonical_is_rejected(self) -> None:
        broken = self.html.replace('href="glossary.html"', 'href="https://aiengineeringfromscratch.com/glossary.html"', 1)
        errors = validator.audit(broken, self.shell, self.css)
        self.assertTrue(any("canonical" in error for error in errors), errors)

    def test_missing_live_region_is_rejected(self) -> None:
        broken = self.html.replace('aria-live="polite"', 'aria-live="off"', 1)
        errors = validator.audit(broken, self.shell, self.css)
        self.assertTrue(any("live-result" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        broken = self.css.replace("padding-block-start: calc(var(--header-offset) + 16px)", "padding-block-start: 64px", 1)
        errors = validator.audit(self.html, self.shell, broken)
        self.assertTrue(any("header-offset" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
