#!/usr/bin/env python3
"""
extension_eval.py — Crystal Context VSIX: package sanity, bundle, and webview regression (npm test).

Run from repo root. Writes Code_Improver/summaries/latest_extension.json.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("IMPROVE_PROJECT_ROOT", Path(__file__).resolve().parents[2]))
SUMMARY_PATH = Path(os.environ.get(
    "IMPROVE_SUMMARY_PATH",
    ROOT / "Code_Improver" / "summaries" / "latest_extension.json",
))


def npm_exe() -> str | None:
    return shutil.which("npm") or shutil.which("npm.cmd")


def run(cmd: list[str]) -> tuple[int, str]:
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        shell=False,
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, out.strip()


def evaluate() -> dict:
    checks: list[dict] = []
    failures = 0

    def check(name: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        checks.append({"id": name, "passed": ok, "detail": detail})
        if not ok:
            failures += 1

    pkg_path = ROOT / "package.json"
    if not pkg_path.is_file():
        check("package_json_exists", False, "missing package.json")
    else:
        try:
            data = json.loads(pkg_path.read_text(encoding="utf-8"))
            check("package_json_parse", True, "")
            check("package_json_has_main", bool(data.get("main")), "expected main field")
            scripts = data.get("scripts") or {}
            check("package_json_has_test", "test" in scripts, "expected npm test script")
            check("package_json_has_build", "build" in scripts, "expected npm run build script")
        except json.JSONDecodeError as e:
            check("package_json_parse", False, str(e))

    check("extension_js_exists", (ROOT / "extension.js").is_file(), "missing extension.js")
    check("crystalcontext_config_present", (ROOT / "crystalcontext_config.md").is_file(),
          "sample crystalcontext_config.md at repo root")

    npm = npm_exe()
    if not npm:
        check("npm_on_path", False, "npm not found on PATH")
    else:
        check("npm_on_path", True, npm)
        rc, out = run([npm, "run", "build"])
        tail = out[-4000:] if out else ""
        check("npm_run_build", rc == 0, tail)

        rc, out = run([npm, "test"])
        tail = out[-4000:] if out else ""
        check("npm_test_webview_regression", rc == 0, tail)

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
