#!/usr/bin/env python3
"""Tests for the Codeology catalog validator."""

from __future__ import annotations

import unittest

import validate_codeology_catalog as validator


class CodeologyCatalogTest(unittest.TestCase):
    def setUp(self) -> None:
        self.html = validator.CATALOG.read_text(encoding="utf-8")
        self.css = validator.CSS.read_text(encoding="utf-8")

    def test_repository_catalog_passes(self) -> None:
        self.assertEqual(validator.audit(self.html, self.css), [])
        self.assertEqual(validator.audit_baselines(validator.BASELINES), [])

    def test_upstream_canonical_is_rejected(self) -> None:
        broken = self.html.replace('href="catalog.html"', 'href="https://aiengineeringfromscratch.com/catalog.html"', 1)
        errors = validator.audit(broken, self.css)
        self.assertTrue(any("canonical" in error for error in errors), errors)

    def test_non_keyboard_sort_header_is_rejected(self) -> None:
        broken = self.html.replace('data-sort="phase" tabindex="0"', 'data-sort="phase"', 1)
        errors = validator.audit(broken, self.css)
        self.assertTrue(any("keyboard-sortable" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        broken = self.css.replace(
            'html[data-product="codeology"] .catalog-page {\n  padding-block-start: calc(var(--header-offset) + 16px);',
            'html[data-product="codeology"] .catalog-page {\n  padding-block-start: 80px;',
            1,
        )
        errors = validator.audit(self.html, broken)
        self.assertTrue(any("header-offset" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
