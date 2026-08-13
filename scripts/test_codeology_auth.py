#!/usr/bin/env python3
"""Tests for the Codeology auth boundary validator."""

from __future__ import annotations

import json
import unittest

import validate_codeology_auth as validator


class CodeologyAuthTest(unittest.TestCase):
    def inputs(self) -> list:
        return [
            validator.AUTH.read_text(encoding="utf-8"),
            validator.PROGRESS.read_text(encoding="utf-8"),
            validator.SHELL.read_text(encoding="utf-8"),
            validator.CSS.read_text(encoding="utf-8"),
            validator.BUILD.read_text(encoding="utf-8"),
            json.loads(validator.PACKAGE.read_text(encoding="utf-8")),
            validator.ENV_EXAMPLE.read_text(encoding="utf-8"),
            validator.migration_text(),
        ]

    def test_repository_auth_boundary_passes(self) -> None:
        self.assertEqual(validator.audit(*self.inputs()), [])

    def test_missing_rls_is_rejected(self) -> None:
        inputs = self.inputs()
        inputs[-1] = inputs[-1].replace("enable row level security", "disable row level security")
        errors = validator.audit(*inputs)
        self.assertTrue(any("row level security" in error for error in errors), errors)

    def test_public_secret_is_rejected(self) -> None:
        inputs = self.inputs()
        inputs[0] += "\nconst leaked = 'sb_secret_example';"
        errors = validator.audit(*inputs)
        self.assertTrue(any("sb_secret_" in error for error in errors), errors)

    def test_unpinned_client_is_rejected(self) -> None:
        inputs = self.inputs()
        inputs[5]["dependencies"]["@supabase/supabase-js"] = "^2.112.3"
        errors = validator.audit(*inputs)
        self.assertTrue(any("must be pinned" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
