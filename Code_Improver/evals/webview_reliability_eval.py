#!/usr/bin/env python3
"""
webview_reliability_eval.py — regression tests for 'nothing loads' / stale VSIX / silent webview failures.

Static checks on extension.js, package.json, .vscodeignore, and package.json scripts.
Run from repo root. Writes Code_Improver/summaries/latest_webview_reliability.json
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
    ROOT / "Code_Improver" / "summaries" / "latest_webview_reliability.json",
))
EXT = ROOT / "extension.js"
PKG = ROOT / "package.json"
VSI = ROOT / ".vscodeignore"


def evaluate() -> dict:
    checks: list[dict] = []
    failures = 0

    def check(cid: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        checks.append({"id": cid, "passed": ok, "detail": detail})
        if not ok:
            failures += 1

    if not EXT.is_file():
        check("rel_extension_js_exists", False, "missing extension.js")
        return _payload(checks, failures)

    dist_js = ROOT / "dist" / "extension.js"
    if dist_js.is_file():
        try:
            s_m = EXT.stat().st_mtime
            d_m = dist_js.stat().st_mtime
            check(
                "rel_dist_bundle_not_stale_vs_extension",
                d_m + 0.5 >= s_m,
                "run npm run build so dist/extension.js is at least as new as extension.js",
            )
        except OSError:
            check("rel_dist_bundle_not_stale_vs_extension", False, "could not stat extension.js / dist")
    else:
        check("rel_dist_bundle_not_stale_vs_extension", False, "missing dist/extension.js — run npm run build")

    src = EXT.read_text(encoding="utf-8", errors="replace")

    # --- Ready / load pipeline (conversation regressions) ---
    check(
        "rel_ready_synchronous_send",
        "scheduleWebviewReady" in src
        and "function send()" in src
        and re.search(r"send\s*\(\s*\)\s*;", src) is not None
        and "if (document.readyState === 'loading')" in src,
        "end-of-script send() so ready fires even if DOMContentLoaded/load miss listeners",
    )
    check(
        "rel_ready_idempotent_guard",
        "__ccReadyDone" in src,
        "single-fire guard for ready",
    )
    _ri = src.find("case 'ready'")
    if _ri == -1:
        _ri = src.find('case "ready"')
    check(
        "rel_host_ready_then_loaditems",
        _ri != -1 and "_loadItems()" in src[_ri : _ri + 400],
        "ready handler must call _loadItems",
    )
    check(
        "rel_loaditems_gated_by_webview_ready",
        "!this._isWebviewReady" in src or "!this._isWebviewReady)" in src,
        "_loadItems must bail if webview never sent ready",
    )

    # --- Diagnostics ---
    check(
        "rel_webview_diag_pipeline",
        "webviewDiagHook" in src
        and re.search(r"case\s+['\"]webviewDiag['\"]", src) is not None
        and "_recordWebviewDiag" in src,
        "forward webview console/window errors to host",
    )
    check(
        "rel_session_start_logged",
        "_recordWebviewSessionStart" in src and "case 'ready'" in src,
        "log a line when webview connects so log file is not empty only on errors",
    )
    _ai = src.find("_appendWorkspaceDebugLog")
    _chunk = src[_ai : _ai + 950] if _ai != -1 else ""
    check(
        "rel_log_append_dual_location",
        "globalStorageUri" in _chunk and "workspaceFolders" in _chunk,
        "append debug log to workspace and/or globalStorage",
    )

    # --- Packaging / stale bundle ---
    if PKG.is_file():
        try:
            pkg = json.loads(PKG.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            check("rel_package_main_is_dist_bundle", False, str(e))
        else:
            main = pkg.get("main") or ""
            check(
                "rel_package_main_is_dist_bundle",
                main.replace("\\", "/") == "./dist/extension.js",
                f"main must be ./dist/extension.js, got {main!r}",
            )
            scripts = pkg.get("scripts") or {}
            test_s = scripts.get("test") or ""
            check(
                "rel_npm_test_includes_extension_integration",
                "extension-test.js" in test_s and "npm run build" in test_s,
                "npm test must build then run test/extension-test.js",
            )
            check(
                "rel_improver_loop_script_present",
                "improver:loop" in scripts and "run_loop.py" in scripts.get("improver:loop", ""),
                "npm run improver:loop should run Code_Improver/run_loop.py",
            )
            check(
                "rel_release_script_present",
                scripts.get("release") == "npm run improver:loop",
                "npm run release should alias the full eval loop (incl. VSIX freshness eval)",
            )
    else:
        check("rel_package_main_is_dist_bundle", False, "missing package.json")
        check("rel_npm_test_includes_extension_integration", False, "missing package.json")
        check("rel_improver_loop_script_present", False, "missing package.json")
        check("rel_release_script_present", False, "missing package.json")

    if VSI.is_file():
        vi = VSI.read_text(encoding="utf-8", errors="replace")
        check(
            "rel_vscodeignore_excludes_source_extension_js",
            any(line.strip() in ("extension.js", "**/extension.js") for line in vi.splitlines())
            or "extension.js" in vi,
            ".vscodeignore must list extension.js so VSIX ships dist bundle only",
        )
    else:
        check("rel_vscodeignore_excludes_source_extension_js", False, "missing .vscodeignore")

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
