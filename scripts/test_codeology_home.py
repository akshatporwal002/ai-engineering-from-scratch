#!/usr/bin/env python3
"""Tests for the Codeology homepage validator."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import validate_codeology_home as validator


class CodeologyHomeTest(unittest.TestCase):
    def test_repository_homepage_passes(self) -> None:
        html = validator.HOME.read_text(encoding="utf-8")
        self.assertEqual(validator.audit(html), [])
        self.assertEqual(validator.audit_baselines(), [])

    def test_broken_fragment_is_rejected(self) -> None:
        html = validator.HOME.read_text(encoding="utf-8").replace(
            'href="#contents"', 'href="#missing-section"', 1
        )
        errors = validator.audit(html)
        self.assertTrue(any("missing id #missing-section" in error for error in errors), errors)

    def test_visible_inherited_social_proof_is_rejected(self) -> None:
        html = validator.HOME.read_text(encoding="utf-8").replace(
            'aria-label="Where readers learn and where the course is discussed" hidden',
            'aria-label="Where readers learn and where the course is discussed"',
            1,
        )
        errors = validator.audit(html)
        self.assertTrue(any("social-proof marketing" in error for error in errors), errors)

    def test_invalid_visual_baseline_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "invalid.jpg"
            path.write_bytes(b"not a jpeg")
            errors = validator.audit_baselines({path: (1, 1)})
            self.assertTrue(any("invalid or missing" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
