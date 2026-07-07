#!/usr/bin/env python3
"""
notepad_eval.py — static checks for Notepad tab + crystalcontext_notepad.txt persistence (task 004).

Run from repo root. Writes Code_Improver/summaries/latest_notepad.json
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(os.environ.get("IMPROVE_PROJECT_ROOT", Path(__file__).resolve().parents[2]))
SUMMARY_PATH = Path(os.environ.get(
    "IMPROVE_SUMMARY_PATH",
    ROOT / "Code_Improver" / "summaries" / "latest_notepad.json",
))
EXT = ROOT / "extension.js"
PKG = ROOT / "package.json"


def evaluate() -> dict:
    checks: list[dict] = []
    failures = 0

    def check(cid: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        checks.append({"id": cid, "passed": ok, "detail": detail})
        if not ok:
            failures += 1

    if not EXT.is_file():
        check("notepad_extension_js", False, "missing extension.js")
        return _payload(checks, failures)

    src = EXT.read_text(encoding="utf-8", errors="replace")

    check(
        "notepad_filename_constant",
        "crystalcontext_notepad.txt" in src and "NOTEPAD_FILE" in src,
        "expect NOTEPAD_FILE / crystalcontext_notepad.txt",
    )
    check(
        "notepad_handlers",
        all(x in src for x in ("case 'notepadLoad'", "case 'saveNotepad'", "case 'clearNotepad'", "case 'copyNotepad'")),
        "expect notepad message handlers",
    )
    check(
        "notepad_dom_ids",
        all(x in src for x in ("notepadEditor", "notepadCopy", "notepadClear", "notepad-panel-inner")),
        "expect Notepad UI injected into #panels when YAML Notepad tab is active",
    )
    check(
        "notepad_debounce_save",
        "setTimeout" in src and ((', 400)' in src or ',400)' in src)),
        "expect debounced save (~400ms)",
    )
    check(
        "notepad_yaml_tab_notepad",
        "function isNotepadTab" in src,
        "expect Notepad tab from crystalcontext_config to show notepad editor",
    )
    check(
        "notepad_messages_to_host",
        "command: 'notepadLoad'" in src.replace('"', "'") or 'command: "notepadLoad"' in src,
        "expect webview notepadLoad postMessage",
    )

    pkg_txt = PKG.read_text(encoding="utf-8", errors="replace") if PKG.is_file() else ""
    check(
        "notepad_npm_test_runs_console_smoke",
        "webview-console-smoke.js" in pkg_txt and '"test"' in pkg_txt,
        "package.json test should run webview-console-smoke.js (no console errors)",
    )

    return _payload(checks, failures)


def _payload(checks: list[dict], failures: int) -> dict:
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
