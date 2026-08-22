#!/usr/bin/env python3
"""Tests for the account-backed CV Analysis validator."""

from __future__ import annotations

import unittest

import validate_codeology_cv_analysis as validator


class CodeologyCVAnalysisTest(unittest.TestCase):
    def test_repository_contract_passes(self) -> None:
        self.assertEqual(validator.audit(*validator.inputs()), [])

    def test_pdf_support_is_required(self) -> None:
        values = list(validator.inputs())
        values[0] = values[0].replace(".pdf,", "")
        errors = validator.audit(*values)
        self.assertTrue(any("accept .pdf" in error for error in errors), errors)

    def test_provider_consent_is_required(self) -> None:
        values = list(validator.inputs())
        values[0] = values[0].replace('id="cvProviderConsent" type="checkbox" required', 'id="cvProviderConsent" type="checkbox"')
        errors = validator.audit(*values)
        self.assertTrue(any("consent" in error for error in errors), errors)

    def test_rls_is_required_for_each_public_table(self) -> None:
        values = list(validator.inputs())
        values[-1] = values[-1].replace("enable row level security", "disable row level security", 1)
        errors = validator.audit(*values)
        self.assertTrue(any("all three" in error for error in errors), errors)

    def test_browser_secret_storage_is_rejected(self) -> None:
        values = list(validator.inputs())
        values[1] += "\nlocalStorage.setItem('cv-key', secret);"
        errors = validator.audit(*values)
        self.assertTrue(any("forbidden marker" in error for error in errors), errors)

    def test_hiring_claim_boundary_is_required(self) -> None:
        values = list(validator.inputs())
        values[0] = values[0].replace("Formative guidance, not a hiring prediction", "Your hiring forecast")
        errors = validator.audit(*values)
        self.assertTrue(any("hiring prediction" in error for error in errors), errors)


if __name__ == "__main__": unittest.main()
