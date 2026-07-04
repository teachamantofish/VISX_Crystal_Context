# Webview / VSIX “nothing loads” — issue catalog

This documents failures we have hit repeatedly when the Crystal Context sidebar stayed on **Loading…** or appeared blank, and what prevents them.

**Code_Improver task:** **`Code_Improver/tasks/007_issue_catalog_webview_vsix.json`** — success criteria and eval mapping. Automated checks: **`Code_Improver/evals/issue_catalog_eval.py`** (plus **`webview_reliability_eval`**, **`vsix_freshness_eval`**, **`extension_eval`** in the full loop).

| # | Symptom / cause | Mitigation |
|---|-----------------|------------|
| 1 | **`ready` never reached the host** — webview script waited only on `window` `load`, or on `DOMContentLoaded`/`load` after listeners were registered **too late** (event already fired or never fires in embedded webviews). | **Synchronous `send()`** at end of webview script (after wiring listeners), plus idempotent guard; optional extra listeners as backup. |
| 2 | **Stale runtime** — `extension.js` edited but **`dist/extension.js` not rebuilt**; packaged VSIX or installed build is old. | **`npm run release`** / **`npm run improver:loop`** already runs **`npm run build`**, **`npm test`**, and **`npm run package`** (see `vsix_freshness_eval.py`). If that gate **passes**, you do **not** need a separate manual build before install—the artifacts are current. For F5 only, **`preLaunchTask`** build or run **`npm run build`** once. |
| 3 | **Wrong package entry** — `package.json` `main` must point at **`./dist/extension.js`**, not unpacked source. | Enforced by eval + manual review. |
| 4 | **Local scope with no folder** — host posts **`noWorkspace`**; UI should show message, not infinite Loading (depends on `ready` + message delivery). | Open a **folder** or switch to **Global (.claude)** and place `crystalcontext_config.md` in **`%USERPROFILE%\.claude\`**. |
| 5 | **Missing config file** — **`noFile`** for `crystalcontext_config.md`. | Add file at workspace root (Local) or **`%USERPROFILE%\.claude\`** (Global). |
| 5b | **Config watcher threw before `onDidReceiveMessage` was registered** — infinite Loading with no `ready` handling. | **Fixed:** message handler is registered first; watcher creation is wrapped; **`.claude`** is **`mkdir -p`**’d before watching. |
| 6 | **YAML / parse errors** — **`parseError`** posted; panel should show error text. | Fix `crystalcontext_config.md` fenced YAML. |
| 7 | **Silent webview JS errors** — hard to debug without DevTools. | **`webviewDiag`** forwarding + **Output** channel + **`crystalcontext_webview_debug.log`** (workspace + globalStorage). |
| 8 | **Log file “missing”** — log only appended on errors earlier; no file until first failure. | **`_recordWebviewSessionStart`** on every `ready` so a line exists when the webview connects. |
| 9 | **VSIX contained dev junk** — huge package, wrong files. | **`.vscodeignore`** excludes `extension.js`, `Code_Improver/`, `test/`, etc. |
| 10 | **esbuild / template literal breaks** — unescaped **backticks** inside `` `_getHtml` `` template literal break the bundle. | Comments inside the HTML template must not use `` ` ``; use plain text comments. |
| 11 | **Integration test gaps** — mocks missing **`vscode.Uri`**, **`onDidChangeWorkspaceFolders`**, **`globalState`** hid host crashes. | **`test/extension-test.js`** updated; part of **`npm test`**. |

## What you run

- **`npm run release`** — same as **`npm run improver:loop`**: **`npm run build`**, all eval gates (including **`npm test`** inside **`extension_eval`**), then **`vsix_freshness_eval.py`** runs **`npm run package`** and checks the newest **`crystal-context-*.vsix`** is **≤ 2 minutes** old (default; **`VSIX_MAX_AGE_SEC`** to override). **When this exits 0, `dist/` and the `.vsix` are already built**—you do not run build again before **`cursor --install-extension … --force`** unless you changed sources after the run.
- **`SKIP_VSIX_PACKAGE=1`** (env) — `vsix_freshness_eval.py` skips packaging and only checks **`dist/extension.js`** vs **`extension.js`** (faster; no new VSIX).
- **`npm test`** — also runs **`npm run build` first**; use alone for a quick check without the full eval list.

**Agent / CI:** If the improvement loop completed successfully in this repo, the same rule applies: **tests did not pass without a current build**, so there is no extra “remember to build” step before install from that run.

## Related

- `dev/WEBVIEW_DEV_WORKFLOW.md` — Output channel, log paths, F5 vs VSIX.
