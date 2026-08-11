#!/usr/bin/env python3
"""Tests for the Codeology lesson-reader validator."""

from __future__ import annotations

import unittest

import validate_codeology_lesson as validator


class CodeologyLessonTest(unittest.TestCase):
    def setUp(self) -> None:
        self.lesson = validator.LESSON.read_text(encoding="utf-8")
        self.shell = validator.SHELL.read_text(encoding="utf-8")

    def test_repository_lesson_reader_passes(self) -> None:
        self.assertEqual(validator.audit(self.lesson, self.shell), [])
        css = (validator.ROOT / "site" / "codeology.css").read_text(encoding="utf-8")
        self.assertEqual(validator.audit_css(css), [])
        self.assertEqual(validator.audit_baselines(validator.BASELINES), [])

    def test_upstream_canonical_is_rejected(self) -> None:
        broken = self.lesson.replace(
            '<link rel="canonical" href="lesson.html">',
            '<link rel="canonical" href="https://aiengineeringfromscratch.com/lesson.html">',
            1,
        )
        errors = validator.audit(broken, self.shell)
        self.assertTrue(any("canonical" in error for error in errors), errors)

    def test_missing_render_event_is_rejected(self) -> None:
        broken = self.lesson.replace("codeology:lesson-rendered", "lesson:rendered")
        errors = validator.audit(broken, self.shell)
        self.assertTrue(any("rendered" in error for error in errors), errors)

    def test_unencoded_pinned_path_is_rejected(self) -> None:
        broken = self.shell.replace(
            "path.split('/').map(encodeURIComponent).join('/')", "path"
        )
        errors = validator.audit(self.lesson, broken)
        self.assertTrue(any("encodeURIComponent" in error for error in errors), errors)

    def test_missing_header_clearance_is_rejected(self) -> None:
        self.assertTrue(validator.audit_css(".lesson-layout { padding-top: 56px; }"))


if __name__ == "__main__":
    unittest.main()
