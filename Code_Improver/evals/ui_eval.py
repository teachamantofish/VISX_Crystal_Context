#!/usr/bin/env python3
"""
ui_eval.py — task 005 UI checks (strings, layout, scope vs prompt field).

Run from repo root. Writes Code_Improver/summaries/latest_ui.json
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(os.environ.get("IMPROVE_PROJECT_ROOT", Path(__file__).resolve().parents[2]))
SUMMARY_PATH = Path(os.environ.get(
    "IMPROVE_SUMMARY_PATH",
    ROOT / "Code_Improver" / "summaries" / "latest_ui.json",
))
EXT = ROOT / "extension.js"
PKG = ROOT / "package.json"
README = ROOT / "readme.md"


def evaluate() -> dict:
    checks: list[dict] = []
    failures = 0

    def check(cid: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        checks.append({"id": cid, "passed": ok, "detail": detail})
        if not ok:
            failures += 1

    needle = "Prompt Builder"
    checks_files = [
        (EXT, "ui_no_prompt_builder_in_extension_js", "extension.js"),
        (PKG, "ui_no_prompt_builder_in_package_json", "package.json"),
        (README, "ui_no_prompt_builder_in_readme_md", "readme.md"),
    ]
    for path, cid, label in checks_files:
        if path.is_file():
            text = path.read_text(encoding="utf-8", errors="replace")
            check(cid, needle not in text, label)
        else:
            check(cid + "_missing", False, f"missing {path.name}")

    if EXT.is_file():
        src = EXT.read_text(encoding="utf-8", errors="replace")
        check(
            "ui_config_scope_row_wraps",
            ".config-scope-row" in src and "flex-wrap" in src,
            "config row should use flex-wrap",
        )
        check(
            "ui_no_duplicate_prompt_notepad_bar",
            ".main-tab-bar" not in src and "data-main-tab" not in src,
            "removed extra Prompt/Notepad button row",
        )
        idx = src.find("command === 'configScope'")
        if idx != -1:
            chunk = src[idx : idx + 550]
            check(
                "ui_config_scope_does_not_rebuild_prompt",
                "rebuildOutput" not in chunk,
                "changing config scope must not rebuild assembled prompt textarea",
            )
        else:
            check("ui_config_scope_handler_present", False, "missing configScope branch")

        check(
            "ui_prompt_textarea_fixed_height",
            "#output" in src and "75px" in src,
            "assembled prompt textarea fixed height (~75px)",
        )
        check(
            "ui_notepad_editor_flex_fill",
            ".notepad-editor" in src and "flex: 1" in src,
            "notepad editor fills Notepad view",
        )
        check(
            "ui_notepad_txt_filename",
            "crystalcontext_notepad.txt" in src,
            "notepad file name",
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
