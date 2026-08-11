#!/usr/bin/env python3
"""Run the Unix translation publisher contract tests where supported."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    if os.name == "nt":
        print(
            "SKIP: translation publisher contract tests require the Ubuntu CI "
            "shell and Git worktree semantics."
        )
        return 0
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "test_translate_workflow.py")],
        cwd=ROOT,
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
