#!/usr/bin/env python3
"""Tests for the Codeology CV Analysis validator."""

from __future__ import annotations

import json
import unittest

import validate_codeology_cv_analysis as validator


def repository_inputs() -> tuple[str, str, str, str, dict, str]:
    return (
        validator.PAGE.read_text(encoding="utf-8"),
        validator.ENGINE.read_text(encoding="utf-8"),
        validator.UI.read_text(encoding="utf-8"),
        validator.CSS.read_text(encoding="utf-8"),
        json.loads(validator.CONFIG.read_text(encoding="utf-8")),
        validator.DOC.read_text(encoding="utf-8"),
    )


class CodeologyCVAnalysisTest(unittest.TestCase):
    def test_repository_contract_passes(self) -> None:
        self.assertEqual(validator.audit(*repository_inputs()), [])

    def test_network_call_is_rejected(self) -> None:
        page, engine, ui, css, config, documentation = repository_inputs()
        errors = validator.audit(page, engine, ui + "\nfetch('/api/cv')", css, config, documentation)
        self.assertTrue(any("network or persistent storage" in error for error in errors), errors)

    def test_pdf_input_is_rejected(self) -> None:
        page, engine, ui, css, config, documentation = repository_inputs()
        page = page.replace(".txt,.md,text/plain,text/markdown", ".txt,.md,.pdf,application/pdf")
        errors = validator.audit(page, engine, ui, css, config, documentation)
        self.assertTrue(any("TXT/MD only" in error for error in errors), errors)

    def test_missing_claim_boundary_is_rejected(self) -> None:
        page, engine, ui, css, config, documentation = repository_inputs()
        page = page.replace("Formative guidance only", "Career result")
        errors = validator.audit(page, engine, ui, css, config, documentation)
        self.assertTrue(any("formative guidance only" in error for error in errors), errors)

    def test_navigation_route_is_required(self) -> None:
        page, engine, ui, css, config, documentation = repository_inputs()
        config["product"]["navigation"] = [
            item for item in config["product"]["navigation"] if item["href"] != "cv-analysis.html"
        ]
        errors = validator.audit(page, engine, ui, css, config, documentation)
        self.assertTrue(any("navigation requires" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
