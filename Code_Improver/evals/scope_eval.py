#!/usr/bin/env python3
"""
scope_eval.py — static checks for Local vs Global crystalcontext_config.md (task 003).

Run from repo root. Writes Code_Improver/summaries/latest_scope.json.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(os.environ.get("IMPROVE_PROJECT_ROOT", Path(__file__).resolve().parents[2]))
SUMMARY_PATH = Path(os.environ.get(
    "IMPROVE_SUMMARY_PATH",
    ROOT / "Code_Improver" / "summaries" / "latest_scope.json",
))
EXT = ROOT / "extension.js"


def evaluate() -> dict:
    checks: list[dict] = []
    failures = 0

    def check(cid: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        checks.append({"id": cid, "passed": ok, "detail": detail})
        if not ok:
            failures += 1

    if not EXT.is_file():
        check("scope_extension_js_exists", False, "missing extension.js")
        return _payload(checks, failures)

    src = EXT.read_text(encoding="utf-8", errors="replace")

    # UI: two radios, clickable, Local vs Global
    check(
        "scope_ui_two_radios_local_global",
        bool(
            re.search(r'type\s*=\s*"radio"[^>]*name\s*=\s*"configScope"', src)
            and "radioScopeLocal" in src
            and "radioScopeGlobal" in src
        ),
        "expect two radios name=configScope with ids radioScopeLocal / radioScopeGlobal",
    )
    check(
        "scope_ui_labels_project_and_home",
        "Local (project root)" in src and "Global (.claude)" in src,
        "expect visible labels for Local (project root) and Global (.claude)",
    )

    # Extension protocol
    check(
        "scope_message_handler_setConfigScope",
        re.search(r"case\s+['\"]setConfigScope['\"]", src) is not None,
        "expect onDidReceiveMessage case setConfigScope",
    )
    check(
        "scope_webview_posts_setConfigScope",
        "vscode.postMessage({ command: 'setConfigScope'" in src
        or 'vscode.postMessage({ command: "setConfigScope"' in src,
        "expect vscode.postMessage setConfigScope from webview",
    )

    # Persistence
    check(
        "scope_globalstate_key",
        "crystalContext.configScope" in src or "CONFIG_SCOPE_KEY" in src,
        "expect globalState key for config scope",
    )

    # Path resolution
    check(
        "scope_resolve_local_workspace_path",
        "_resolveConfigPathInfo" in src and "workspaceFolders" in src,
        "expect _resolveConfigPathInfo using workspaceFolders for local scope",
    )
    check(
        "scope_resolve_global_homedir",
        "GLOBAL_CONFIG_DIR" in src
        and ".claude" in src
        and ("path.join(home, GLOBAL_CONFIG_DIR, CONFIG_FILE)" in src),
        "expect global config at path.join(os.homedir(), '.claude', crystalcontext_config.md)",
    )
    check(
        "scope_constants_config_filename",
        "crystalcontext_config.md" in src,
        "expect crystalcontext_config.md filename",
    )

    # Watcher
    check(
        "scope_setup_config_watcher",
        "_setupConfigWatcher" in src,
        "expect _setupConfigWatcher to refresh on file changes",
    )

    # Payloads include scope for UI sync
    check(
        "scope_loaditems_includes_configScope",
        "configScope" in src and ("command: 'loadItems'" in src or 'command: "loadItems"' in src),
        "expect loadItems postMessage to include configScope",
    )
    check(
        "scope_sync_message_configScope",
        "command: 'configScope'" in src or 'command: "configScope"' in src,
        "expect configScope message to sync radios",
    )

    # Workspace folder changes
    check(
        "scope_on_did_change_workspace_folders",
        "onDidChangeWorkspaceFolders" in src,
        "expect reload when workspace folders change (Local scope)",
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
