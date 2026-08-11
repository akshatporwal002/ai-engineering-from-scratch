#!/usr/bin/env python3
"""Run certification tests and demos consistently on Windows and CI."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / "certifications" / "claude" / "lessons"


def run_all(pattern: str, label: str) -> int:
    paths = sorted(LESSONS.glob(pattern))
    print(f"Running {len(paths)} {label}...")
    for path in paths:
        result = subprocess.run([sys.executable, str(path)], cwd=path.parent)
        if result.returncode:
            print(f"FAILED: {path.relative_to(ROOT)}")
            return result.returncode
    return 0


def main() -> int:
    result = run_all("*/code/tests/test_*.py", "certification test files")
    if result:
        return result
    return run_all("*/code/main.py", "certification demos")


if __name__ == "__main__":
    sys.exit(main())
