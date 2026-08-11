#!/usr/bin/env python3
"""Tests for the Codeology shell validator."""

from __future__ import annotations

import json
import unittest

import validate_codeology_shell as validator


class CodeologyShellTest(unittest.TestCase):
    def test_repository_shell_passes(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        self.assertEqual(
            validator.audit(
                config,
                validator.CSS.read_text(encoding="utf-8"),
                validator.SHELL.read_text(encoding="utf-8"),
                validator.HEADER.read_text(encoding="utf-8"),
                registry,
            ),
            [],
        )

    def test_source_drift_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        config["academySource"]["baselineCommit"] = "f" * 40
        errors = validator.audit(
            config,
            validator.CSS.read_text(encoding="utf-8"),
            validator.SHELL.read_text(encoding="utf-8"),
            validator.HEADER.read_text(encoding="utf-8"),
            registry,
        )
        self.assertTrue(any("drifts from registry" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
