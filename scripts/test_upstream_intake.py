#!/usr/bin/env python3
"""Unit tests for deterministic upstream change reporting."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import advance_source_baseline as advance
import report_upstream_changes as report


class ParseChangesTest(unittest.TestCase):
    def test_parses_add_modify_remove_and_rename(self) -> None:
        changes = report.parse_name_status(
            "A\0phases/20-new/01-first/docs/en.md\0"
            "M\0site/build.js\0"
            "D\0glossary/old.md\0"
            "R100\0phases/01-old/02-before/docs/en.md\0"
            "phases/01-old/02-after/docs/en.md\0"
        )
        self.assertEqual([change.status for change in changes], [
            "added", "modified", "removed", "renamed"
        ])
        self.assertEqual(changes[-1].previous_path, "phases/01-old/02-before/docs/en.md")

    def test_collects_unique_lesson_directories(self) -> None:
        changes = [
            report.Change("added", "phases/20-new/01-first/docs/en.md"),
            report.Change("added", "phases/20-new/01-first/quiz.json"),
            report.Change("modified", "README.md"),
        ]
        self.assertEqual(report.changed_lessons(changes), ["phases/20-new/01-first"])

    def test_markdown_marks_license_change_as_blocked(self) -> None:
        rendered = report.render_markdown(
            {
                "project": "Example",
                "sourceUrl": "https://example.com/repo",
                "baseCommit": "a" * 40,
                "headCommit": "b" * 40,
                "license": "MIT",
                "licenseChanged": True,
                "counts": {},
                "changedLessons": [],
                "riskPaths": ["LICENSE"],
                "commits": [],
                "changes": [],
            }
        )
        self.assertIn("YES - BLOCKED", rendered)
        self.assertIn("never authorizes auto-merge", rendered)

    def test_markdown_neutralizes_mentions_and_html(self) -> None:
        rendered = report.render_markdown(
            {
                "project": "Example",
                "sourceUrl": "https://example.com/repo",
                "baseCommit": "a" * 40,
                "headCommit": "b" * 40,
                "license": "MIT",
                "licenseChanged": False,
                "counts": {"modified": 1},
                "changedLessons": [],
                "riskPaths": [],
                "commits": [
                    {
                        "sha": "b" * 40,
                        "authoredAt": "2026-01-01",
                        "subject": "ping @all <b>",
                    }
                ],
                "changes": [
                    {
                        "status": "modified",
                        "path": "README.md",
                        "previous_path": None,
                    }
                ],
            }
        )
        self.assertIn("@\u200ball", rendered)
        self.assertIn("&lt;b&gt;", rendered)


class AdvanceBaselineTest(unittest.TestCase):
    def test_advances_registry_notice_sidecars_and_shell_together(self) -> None:
        old = "a" * 40
        new = "b" * 40
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            registry = root / "content-sources.yml"
            notice = root / "THIRD_PARTY_NOTICES.md"
            shell_config = root / "site" / "codeology-config.json"
            shell_config.parent.mkdir()
            overrides = root / "content" / "overrides"
            source_dir = overrides / "example"
            source_dir.mkdir(parents=True)
            registry.write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "sources": [
                            {
                                "id": "example",
                                "kind": "imported",
                                "baselineCommit": old,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            notice.write_text(f"Imported baseline: `{old}`\n", encoding="utf-8")
            sidecar = source_dir / "adapted.json"
            sidecar.write_text(
                json.dumps({"sourceId": "example", "baselineCommit": old}),
                encoding="utf-8",
            )
            shell_config.write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "academySource": {
                            "sourceId": "example",
                            "baselineCommit": old,
                        },
                    }
                ),
                encoding="utf-8",
            )
            with (
                mock.patch.object(advance, "REGISTRY", registry),
                mock.patch.object(advance, "NOTICE", notice),
                mock.patch.object(advance, "OVERRIDES", overrides),
                mock.patch.object(advance, "SHELL_CONFIG", shell_config),
                mock.patch.object(advance, "commit_sha", return_value=new),
                mock.patch.object(advance, "is_ancestor", return_value=True),
            ):
                self.assertEqual(advance.advance("example", "upstream/main"), (old, new))
            self.assertEqual(
                json.loads(registry.read_text(encoding="utf-8"))["sources"][0]["baselineCommit"],
                new,
            )
            self.assertIn(new, notice.read_text(encoding="utf-8"))
            self.assertEqual(
                json.loads(sidecar.read_text(encoding="utf-8"))["baselineCommit"],
                new,
            )
            self.assertEqual(
                json.loads(shell_config.read_text(encoding="utf-8"))["academySource"][
                    "baselineCommit"
                ],
                new,
            )


if __name__ == "__main__":
    unittest.main()
