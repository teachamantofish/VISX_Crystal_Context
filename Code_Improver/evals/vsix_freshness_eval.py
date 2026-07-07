#!/usr/bin/env python3
"""
vsix_freshness_eval.py — ensure a VSIX was just built (automates npm run package) or verify existing.

Default: runs `npm run package`, then asserts the newest crystal-context-*.vsix mtime is within
the last few minutes (installable artifact matches current sources).

Set SKIP_VSIX_PACKAGE=1 to skip packaging and only check:
  - dist/extension.js exists and is not older than extension.js

Run from repo root. Writes Code_Improver/summaries/latest_vsix_freshness.json
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(os.environ.get("IMPROVE_PROJECT_ROOT", Path(__file__).resolve().parents[2]))
SUMMARY_PATH = Path(os.environ.get(
    "IMPROVE_SUMMARY_PATH",
    ROOT / "Code_Improver" / "summaries" / "latest_vsix_freshness.json",
))
EXT = ROOT / "extension.js"
DIST = ROOT / "dist" / "extension.js"
# Seconds: VSIX must be written within this window after `npm run package` completes.
MAX_VSIX_AGE_SEC = int(os.environ.get("VSIX_MAX_AGE_SEC", "120"))


def npm_cmd() -> list[str]:
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        return []
    return [npm, "run", "package"]


def run_package() -> tuple[int, str]:
    cmd = npm_cmd()
    if not cmd:
        return 1, "npm not found on PATH"
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        shell=False,
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, out[-6000:] if out else ""


def newest_vsix() -> Path | None:
    matches = sorted(ROOT.glob("crystal-context-*.vsix"), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def evaluate() -> dict:
    checks: list[dict] = []
    failures = 0

    def check(cid: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        checks.append({"id": cid, "passed": ok, "detail": detail})
        if not ok:
            failures += 1

    skip = os.environ.get("SKIP_VSIX_PACKAGE", "").lower() in ("1", "true", "yes")

    if skip:
        if not EXT.is_file():
            check("vsix_skip_dist_source_exists", False, "missing extension.js")
            return _out(checks, failures)
        if not DIST.is_file():
            check("vsix_skip_dist_built", False, "missing dist/extension.js — run npm run build")
            return _out(checks, failures)
        src_m = EXT.stat().st_mtime
        dist_m = DIST.stat().st_mtime
        check(
            "vsix_skip_dist_newer_or_equal_source",
            dist_m + 0.5 >= src_m,
            f"dist/extension.js older than extension.js — run npm run build (delta {dist_m - src_m:.1f}s)",
        )
        return _out(checks, failures)

    npm_ok = bool(npm_cmd())
    check("vsix_npm_available", npm_ok, "npm required to run npm run package")
    if not npm_ok:
        return _out(checks, failures)

    rc, tail = run_package()
    check(
        "vsix_npm_package_exit_zero",
        rc == 0,
        tail[-4000:] if tail else "no output",
    )

    vsix = newest_vsix()
    check("vsix_file_exists", vsix is not None, "expected crystal-context-*.vsix in repo root after npm run package")

    if vsix is not None:
        age = time.time() - vsix.stat().st_mtime
        check(
            "vsix_mtime_fresh",
            age <= MAX_VSIX_AGE_SEC,
            f"{vsix.name} age {age:.0f}s (max {MAX_VSIX_AGE_SEC}s)",
        )

    return _out(checks, failures)


def _out(checks: list[dict], failures: int) -> dict:
    passed = sum(1 for c in checks if c["passed"])
    total = len(checks)
    score = passed / total if total else 0.0
    return {
        "all_passed": failures == 0,
        "score": score,
        "metric_name": "score",
        "metric_direction": "higher",
        "passed": passed,
        "failed": failures,
        "total": total,
        "details": checks,
    }


def main() -> None:
    payload = evaluate()
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    sys.exit(0 if payload["all_passed"] else 1)


if __name__ == "__main__":
    main()
