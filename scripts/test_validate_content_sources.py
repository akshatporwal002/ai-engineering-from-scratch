#!/usr/bin/env python3
"""Tests for the Codeology content-source registry validator."""

from __future__ import annotations

import unittest
from unittest import mock

import validate_content_sources as validator


class SourceResolutionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.sources = [
            {
                "id": "upstream",
                "paths": ["docs/**", ".github/**"],
            },
            {
                "id": "codeology",
                "paths": ["docs/CODEOLOGY_*.md", ".github/workflows/quality.yml"],
            },
        ]

    def test_more_specific_rule_wins(self) -> None:
        source, error = validator.resolve_source(
            "docs/CODEOLOGY_PRODUCT_AND_IMPLEMENTATION_PLAN.md", self.sources
        )
        self.assertIsNone(error)
        self.assertEqual(source, "codeology")

    def test_upstream_rule_still_covers_inherited_file(self) -> None:
        source, error = validator.resolve_source("docs/architecture.md", self.sources)
        self.assertIsNone(error)
        self.assertEqual(source, "upstream")

    def test_unowned_path_fails(self) -> None:
        source, error = validator.resolve_source("mystery/file.txt", self.sources)
        self.assertIsNone(source)
        self.assertIn("no source rule", str(error))

    def test_equal_specificity_across_sources_is_ambiguous(self) -> None:
        sources = [
            {"id": "one", "paths": ["content/**"]},
            {"id": "two", "paths": ["content/**"]},
        ]
        source, error = validator.resolve_source("content/example.json", sources)
        self.assertIsNone(source)
        self.assertIn("ambiguous", str(error))


class RepositoryRegistryTest(unittest.TestCase):
    def test_migration_infrastructure_is_original_codeology_work(self) -> None:
        sources = validator.load_registry()["sources"]
        for path in (
            ".github/workflows/platform.yml",
            "docs/NEXTJS_FASTAPI_DEPLOYMENT.md",
            "scripts/run-python.mjs",
        ):
            with self.subTest(path=path):
                self.assertEqual(validator.resolve_source(path, sources), ("codeology", None))

    def test_repository_registry_passes(self) -> None:
        registry = validator.load_registry()
        self.assertEqual(validator.audit(registry), [])

    def test_modified_import_requires_sidecar(self) -> None:
        registry = validator.load_registry()
        with (
            mock.patch.object(validator, "load_sidecars", return_value=({}, [])),
            mock.patch.object(
                validator,
                "changed_paths_since",
                return_value={"AGENTS.md": "modified"},
            ),
            mock.patch.object(validator, "run_git", return_value=""),
        ):
            errors = validator.audit(registry, files=["AGENTS.md"])
        self.assertTrue(
            any("requires an adaptation sidecar" in error for error in errors),
            errors,
        )


if __name__ == "__main__":
    unittest.main()
