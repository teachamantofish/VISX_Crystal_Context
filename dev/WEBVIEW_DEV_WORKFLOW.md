# Webview debugging workflow (repeatable)

**Code_Improver loop (build + all eval gates):** from repo root run `npm run improver:loop`.

**Non-loading / stale VSIX regressions:** see **`dev/WEBVIEW_NON_LOADING_RUNBOOK.md`** and eval **`Code_Improver/evals/webview_reliability_eval.py`** (task **006**).

This extension forwards **webview** `console.error` / `console.warn`, uncaught errors, and unhandled promise rejections to:

1. **Output** — pick **“Crystal Context — Webview”** in the Output dropdown (or run command **Crystal Context: Show Webview Log (Output)**).
2. **Log files** — the same lines append to **`crystalcontext_webview_debug.log`**:
   - **Project root** when you have a workspace folder open (gitignored there).
   - **Also** under the extension’s global storage directory when no folder is open (path varies by OS; search your user data folder for `crystalcontext_webview_debug.log`).
   A **session started** line is written as soon as the webview connects, so the file should exist even if nothing errors yet.

## Loop

1. **F5** — **Run Extension (Extension Development Host)** (build runs first via `preLaunchTask`).
2. In the new window, open a folder that contains `crystalcontext_config.md` (or use Global scope).
3. Open **Crystal Context** in the activity bar and reproduce the problem.
4. For the agent: attach **`crystalcontext_webview_debug.log`** or paste from **Crystal Context — Webview** Output.

Optional: **Developer: Open Webview Developer Tools** in the Extension Development Host for breakpoints and the browser console (human-only; the agent does not see that UI).

## If the panel stays on “Loading…”

1. **Workspace** — With **Local** config scope, open a **folder** (not a single loose file). With **Global**, HOME must contain `crystalcontext_config.md` or switch to Local.
2. **Config file** — Repo root should have `crystalcontext_config.md` (or put it in HOME for Global). Without it you should see an empty-state message, not infinite Loading.
3. **Logs** — **Output → Crystal Context — Webview** and/or **`crystalcontext_webview_debug.log`** in the opened folder.
4. **Stale install** — If you **just** ran a green **`npm run release`** / **`improver:loop`** (or your agent did), **`dist/`** and **`crystal-context-*.vsix`** are already up to date—**do not run build again** before `cursor --install-extension … --force`. Only re-run **`release`** after **new** source edits, or if you never ran the loop on this machine.
5. **Automated checks** — `npm test` runs build first; `npm run release` adds the full eval list + fresh VSIX check. **`SKIP_VSIX_PACKAGE=1`** skips packaging in that last step.

## Force install

cursor --install-extension .\crystal-context-0.0.4.vsix --force

Avoids having to uninstall. 