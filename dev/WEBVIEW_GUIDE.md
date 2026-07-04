# VS Code Extension — Webview Development & Debugging Guide

Generic reference for developing, debugging, and troubleshooting webview panels in any VS Code / Cursor extension.
Crystal Context is used as a concrete example throughout; substitute your own extension name, file names, and scripts.

---

## Logging setup

Forward webview `console.error` / `console.warn`, uncaught errors, and unhandled promise rejections from the webview to the host:

1. **Output channel** — register a named channel in the host (e.g. `"YourExt — Webview"`); expose a command like `YourExt: Show Webview Log` or pick it in the Output dropdown.
2. **Log file** — append the same lines to a debug log:
   - **Workspace root** when a folder is open (add to `.gitignore`).
   - **Global storage** (`context.globalStorageUri`) when no folder is open.
   Write a **session-started** line on every `ready` event so the file exists even when nothing errors yet.

*Crystal Context example:* output channel `"Crystal Context — Webview"`, log file `crystalcontext_webview_debug.log` at workspace root or global storage.

---

## Dev loop (F5)

1. **F5** → **Run Extension (Extension Development Host)** — `preLaunchTask` handles build automatically.
2. In the new host window, open a folder containing your extension's required config/data file (or use Global scope).
3. Open the extension panel and reproduce the problem.
4. Attach the debug log or paste from the Output channel when filing a bug.

Optional: **Developer: Open Webview Developer Tools** in the Extension Development Host gives breakpoints and the browser console (human-only; automated agents cannot see that UI).

---

## If the panel stays on "Loading…"

1. **Workspace scope** — with Local config scope, open a **folder** (not a loose file). With Global scope, ensure the required config file exists in the expected home/profile directory.
2. **Config/data file** — verify the required file exists at the expected path. Without it the panel should show an empty-state message, not infinite Loading.
3. **Logs** — check the Output channel and/or the debug log file in the opened folder.
4. **Stale install** — if you just ran a successful build + package cycle, `dist/` and `.vsix` are current. **Do not re-run build** before `--install-extension … --force` unless you changed sources after that run.
5. **Automated checks** — run your build + test + package pipeline to verify artifacts are fresh before installing.

---

## Issue catalog

Failures that commonly cause a webview panel to stay on **Loading…** or appear blank.
Discovered repeatedly during Crystal Context development; all apply to any VS Code webview extension.

| # | Symptom / cause | Mitigation |
|---|-----------------|------------|
| 1 | **`ready` never reached the host** — webview script waited on `window` `load` or `DOMContentLoaded` after listeners were registered too late (event already fired or never fires in embedded webviews). | Synchronous `send()` at end of webview script (after wiring listeners), plus idempotent guard; optional extra listeners as backup. |
| 2 | **Stale runtime** — `extension.js` edited but `dist/extension.js` not rebuilt; packaged VSIX or installed build is old. | Ensure build runs before install. When your build + package pipeline exits 0, artifacts are current — no extra manual build before `--install-extension … --force`. For F5, `preLaunchTask` handles it. |
| 3 | **Wrong `package.json` `main`** — must point at `./dist/extension.js`, not the unpacked source file. | Enforce in CI or a lint check. |
| 4 | **Local scope with no folder open** — host posts `noWorkspace`; UI should show a message, not infinite Loading (depends on `ready` + message delivery working). | Open a **folder** or switch to Global scope with config in the user home directory. |
| 5 | **Missing config/data file** — `noFile` state not handled in the webview. | Add the file at the expected path, or implement a clear empty-state UI. |
| 5b | **Config watcher threw before `onDidReceiveMessage` was registered** — infinite Loading, no `ready` handling. | Register message handler first; wrap watcher creation; `mkdir -p` watched directories before registering the watcher. |
| 6 | **YAML / JSON parse errors** — `parseError` posted; panel should show error text instead of staying on Loading. | Validate config on write; display parse errors in the webview. |
| 7 | **Silent webview JS errors** — hard to debug without DevTools open. | Forward `console.error`, uncaught errors, and unhandled rejections to an Output channel and log file (see Logging setup above). |
| 8 | **Log file "missing"** — log only appended on errors; no file until first failure. | Write a session-started line on every `ready` so the file exists even when nothing errors. |
| 9 | **VSIX contained dev junk** — large package, wrong files slow install and can break activation. | Maintain `.vscodeignore`; exclude `src/`, `test/`, dev tooling, `node_modules`, etc. |
| 10 | **esbuild / template literal breaks** — unescaped backticks inside an `_getHtml` template literal break the bundle silently. | Avoid `` ` `` in comments inside HTML template strings; use plain-text comments instead. |
| 11 | **Integration test gaps** — incomplete `vscode` mock missing `Uri`, `onDidChangeWorkspaceFolders`, `globalState` hides host crashes. | Audit mock completeness; test against the real VS Code API surface where possible. |

---

## Build & release

Generic pattern: **build → test → package → install**. If your pipeline exits 0, trust its artifacts — no extra manual build before install.

*Crystal Context example (adapt to your own scripts):*

| Command | What it does |
|---------|-------------|
| `npm run release` / `npm run improver:loop` | `npm run build` → all eval gates (including `npm test`) → `npm run package` → freshness check on the `.vsix`. Exit 0 means `dist/` and `.vsix` are current. |
| `SKIP_VSIX_PACKAGE=1 npm run release` | Skip packaging; only check `dist/extension.js` vs `extension.js`. Faster, no new VSIX produced. |
| `npm test` | Runs `npm run build` first; quick check without the full eval list. |

---

## Force install

```bash
# Generic
cursor --install-extension ./your-ext-0.0.1.vsix --force

# Crystal Context example
cursor --install-extension ./crystal-context-0.0.4.vsix --force
```

`--force` skips the uninstall step. Use after every build + package cycle.
