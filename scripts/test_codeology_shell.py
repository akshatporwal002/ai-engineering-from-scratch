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

    def test_low_contrast_semantic_accent_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        css = validator.CSS.read_text(encoding="utf-8").replace(
            "--codeology-accent: #c43b00", "--codeology-accent: #ff5a1f", 1
        )
        errors = validator.audit(
            config,
            css,
            validator.SHELL.read_text(encoding="utf-8"),
            validator.HEADER.read_text(encoding="utf-8"),
            registry,
        )
        self.assertTrue(any("accent/canvas contrast" in error for error in errors), errors)

    def test_script_navigation_destination_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        config["product"]["navigation"][0]["href"] = "javascript:alert(1)"
        errors = validator.audit(
            config,
            validator.CSS.read_text(encoding="utf-8"),
            validator.SHELL.read_text(encoding="utf-8"),
            validator.HEADER.read_text(encoding="utf-8"),
            registry,
        )
        self.assertTrue(any("local public route" in error for error in errors), errors)

    def test_missing_shared_footer_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        shell = validator.SHELL.read_text(encoding="utf-8").replace(
            "replaceFooter(config)", "replaceFooterDisabled(config)"
        )
        errors = validator.audit(
            config,
            validator.CSS.read_text(encoding="utf-8"),
            shell,
            validator.HEADER.read_text(encoding="utf-8"),
            registry,
        )
        self.assertTrue(any("footer ownership" in error for error in errors), errors)

    def test_persistent_source_strip_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        errors = validator.audit(
            config,
            validator.CSS.read_text(encoding="utf-8") + "\n.codeology-source-strip {}",
            validator.SHELL.read_text(encoding="utf-8"),
            validator.HEADER.read_text(encoding="utf-8"),
            registry,
        )
        self.assertTrue(any("must remain removed" in error for error in errors), errors)

    def test_missing_footer_credits_link_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        shell = validator.SHELL.read_text(encoding="utf-8").replace(
            "credits.href = 'credits.html'", "credits.href = 'about.html'", 1
        )
        errors = validator.audit(
            config,
            validator.CSS.read_text(encoding="utf-8"),
            shell,
            validator.HEADER.read_text(encoding="utf-8"),
            registry,
        )
        self.assertTrue(any("footer Credits integration" in error for error in errors), errors)

    def test_login_inside_navigation_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        shell = validator.SHELL.read_text(encoding="utf-8").replace(
            "actions.appendChild(login)", "nav.appendChild(login)", 1
        )
        errors = validator.audit(
            config,
            validator.CSS.read_text(encoding="utf-8"),
            shell,
            validator.HEADER.read_text(encoding="utf-8"),
            registry,
        )
        self.assertTrue(any("right-side action group" in error for error in errors), errors)

    def test_narration_loader_is_rejected(self) -> None:
        config = json.loads(validator.CONFIG.read_text(encoding="utf-8"))
        registry = json.loads(validator.SOURCES.read_text(encoding="utf-8"))
        header = validator.HEADER.read_text(encoding="utf-8") + "\nensureNarration();"
        errors = validator.audit(
            config,
            validator.CSS.read_text(encoding="utf-8"),
            validator.SHELL.read_text(encoding="utf-8"),
            header,
            registry,
        )
        self.assertTrue(any("retired narration" in error for error in errors), errors)

    def test_retired_language_and_narration_assets_are_absent(self) -> None:
        site = validator.ROOT / "site"
        self.assertFalse((site / "lang-picker.js").exists())
        self.assertFalse((site / "tts.js").exists())
        combined = "\n".join(
            (site / name).read_text(encoding="utf-8")
            for name in ("index.html", "lesson.html", "header.js", "build.js")
        )
        for retired in ("lang-picker.js", "langs.js", "ensureNarration", "tts.js"):
            self.assertNotIn(retired, combined)


if __name__ == "__main__":
    unittest.main()
