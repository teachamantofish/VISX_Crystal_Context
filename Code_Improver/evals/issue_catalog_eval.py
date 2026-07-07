#!/usr/bin/env python3
"""
issue_catalog_eval.py — maps dev/WEBVIEW_NON_LOADING_RUNBOOK.md rows to automated checks.

Rows 1–3, 7–9, 11 overlap webview_reliability_eval, vsix_freshness_eval, extension_eval, ui_eval.
This script asserts doc presence, host message paths (noWorkspace / noFile / parseError), and
npm-test wiring. Row 10 (template literals) is partially covered by a conservative pattern
check plus the fact that npm run build runs in the full loop.

Run from repo root. Writes Code_Improver/summaries/latest_issue_catalog.json
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
    ROOT / "Code_Improver" / "summaries" / "latest_issue_catalog.json",
))
RUNBOOK = ROOT / "dev" / "WEBVIEW_NON_LOADING_RUNBOOK.md"
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

    # Doc (catalog source)
    if RUNBOOK.is_file():
        rb = RUNBOOK.read_text(encoding="utf-8", errors="replace")
        check(
            "cat_doc_runbook_present",
            "issue catalog" in rb.lower() or "Symptom / cause" in rb,
            "dev/WEBVIEW_NON_LOADING_RUNBOOK.md should contain the issue table",
        )
        check(
            "cat_doc_runbook_has_eleven_rows",
            rb.count("| 1 |") >= 1 and rb.count("| 11 |") >= 1,
            "runbook table should list rows 1 and 11",
        )
    else:
        check("cat_doc_runbook_present", False, "missing dev/WEBVIEW_NON_LOADING_RUNBOOK.md")
        check("cat_doc_runbook_has_eleven_rows", False, "missing runbook")

    if EXT.is_file():
        src = EXT.read_text(encoding="utf-8", errors="replace")

        # Row 1 — ready pipeline (also in webview_reliability_eval)
        check(
            "cat_row01_ready_synchronous_send",
            "scheduleWebviewReady" in src and "send();" in src and "__ccReadyDone" in src,
            "catalog #1: synchronous ready + guard",
        )

        # Row 4–6 — host posts explicit outcomes (not infinite Loading without explanation)
        check(
            "cat_row04_no_workspace_branch",
            "noWorkspace" in src and "command: 'noWorkspace'" in src.replace('"', "'"),
            "catalog #4: host posts noWorkspace when no folder (Local)",
        )
        check(
            "cat_row05_no_file_branch",
            "noFile" in src and ("command: 'noFile'" in src or 'command: "noFile"' in src),
            "catalog #5: host posts noFile when config missing",
        )
        check(
            "cat_row06_parse_error_branch",
            "parseError" in src and ("command: 'parseError'" in src or 'command: "parseError"' in src),
            "catalog #6: host posts parseError on bad YAML",
        )

        # Row 7–8 — diagnostics
        check(
            "cat_row07_webview_diag",
            "webviewDiagHook" in src and "case 'webviewDiag'" in src,
            "catalog #7: webview errors forwarded to host",
        )
        check(
            "cat_row08_session_start",
            "_recordWebviewSessionStart" in src and "case 'ready'" in src,
            "catalog #8: session line on ready",
        )

        # Row 10 — avoid unescaped ` inside _getHtml template (common esbuild break)
        # Conservative: the HTML template starts with return `<!DOCTYPE — inner ` must not appear
        # in comments except ${nonce}. Flag obvious `` `word` ``-style backticks in the template block.
        m = re.search(r"return `\s*(<!DOCTYPE html>[\s\S]*?)</html>`", src)
        if m:
            inner = m.group(1)
            bad = [ln for ln in inner.splitlines() if re.search(r"//.*`[a-zA-Z]", ln)]
            check(
                "cat_row10_no_backticks_in_js_line_comments_inside_template",
                len(bad) == 0,
                "avoid backticks inside // comments in webview script (breaks esbuild template)" if bad else "",
            )
        else:
            check("cat_row10_no_backticks_in_js_line_comments_inside_template", False, "could not find _getHtml template")

        # Row 11 — integration test
        check(
            "cat_row11_extension_test_in_repo",
            (ROOT / "test" / "extension-test.js").is_file(),
            "test/extension-test.js exists",
        )
    else:
        for cid, det in [
            ("cat_row01_ready_synchronous_send", "missing extension.js"),
            ("cat_row04_no_workspace_branch", "missing extension.js"),
            ("cat_row05_no_file_branch", "missing extension.js"),
            ("cat_row06_parse_error_branch", "missing extension.js"),
            ("cat_row07_webview_diag", "missing extension.js"),
            ("cat_row08_session_start", "missing extension.js"),
            ("cat_row10_no_backticks_in_js_line_comments_inside_template", "missing extension.js"),
            ("cat_row11_extension_test_in_repo", "missing extension.js"),
        ]:
            check(cid, False, det)

    # Row 2–3, 9 — package + ignore (overlap webview_reliability; duplicate light checks)
    if PKG.is_file():
        data = json.loads(PKG.read_text(encoding="utf-8"))
        check(
            "cat_row02_main_points_dist",
            (data.get("main") or "").replace("\\", "/") == "./dist/extension.js",
            "catalog #2–3: main is dist bundle",
        )
        test_s = (data.get("scripts") or {}).get("test") or ""
        check(
            "cat_row11_npm_test_runs_extension_test",
            "extension-test.js" in test_s,
            "catalog #11: npm test includes extension-test.js",
        )
    else:
        check("cat_row02_main_points_dist", False, "missing package.json")
        check("cat_row11_npm_test_runs_extension_test", False, "missing package.json")

    vsi = ROOT / ".vscodeignore"
    if vsi.is_file():
        vi = vsi.read_text(encoding="utf-8", errors="replace")
        check(
            "cat_row09_vscodeignore_excludes_dev",
            "extension.js" in vi and "Code_Improver" in vi,
            "catalog #9: VSIX excludes source + dev dirs",
        )
    else:
        check("cat_row09_vscodeignore_excludes_dev", False, "missing .vscodeignore")

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
        "notes": (
            "Rows covered elsewhere in the full loop: stale VSIX (vsix_freshness_eval), "
            "dist vs source (webview_reliability rel_dist_*), full npm test (extension_eval). "
            "Rows 4–6 user workspace/config are runtime; host branches are asserted above."
        ),
    }


def main() -> None:
    payload = evaluate()
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    sys.exit(0 if payload["all_passed"] else 1)


if __name__ == "__main__":
    main()
