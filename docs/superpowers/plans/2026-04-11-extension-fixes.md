# Prompt Builder Extension Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs in `extension.js` that break the webview entirely, plus repair UX regressions in prompt assembly and tab switching.

**Architecture:** Single-file VS Code extension with a WebviewViewProvider. Extension backend in Node.js (top half of `extension.js`), webview frontend in an inline HTML/JS string (bottom half). Bugs span both halves.

**Tech Stack:** VS Code Extension API, js-yaml, inline HTML/CSS/JS webview

---

## Bug Inventory (found during analysis)

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 1 | **CRITICAL** | line 526 | Stray `y` before `document` → `SyntaxError` → entire webview JS fails to load |
| 2 | **High** | `onTabClick` / change handler | `groupChoice` not cleared on tab switch → stale dropdown values bleed across tabs |
| 3 | **High** | `appendLabelToOutput` / uncheck path | Unchecking an item leaves its label in the textarea; output is append-only with no removal |
| 4 | **Medium** | `_loadItems` | No `fs.watch` / VS Code `workspace.createFileSystemWatcher` → AI_Config.md changes require manual ↺ |

---

## File Structure

Only one file changes:

- **Modify:** `extension.js` — all fixes are here (backend + inline webview script)

---

### Task 1: Fix critical SyntaxError on line 526

The stray `y` makes the webview `<script>` unparseable. Zero JS executes in the webview.

**Files:**
- Modify: `extension.js:526`

- [ ] **Step 1: Confirm the bug**

Open `extension.js` and locate line 526. It reads:
```
  y  document.getElementById('output').value = '';
```
The `y` is a typo. Because it sits on the same line as `document` with only whitespace between them, V8 raises `SyntaxError: Unexpected identifier` when the webview loads the script block. No JS in the webview runs at all.

- [ ] **Step 2: Fix the typo**

In `extension.js`, change line 526 from:
```javascript
  y  document.getElementById('output').value = '';
```
to:
```javascript
    document.getElementById('output').value = '';
```

- [ ] **Step 3: Verify the webview loads**

Run the extension with `F5` (Launch Extension) in VS Code. Open the Prompt Builder side panel. Confirm:
- Tabs render
- Clicking a tab doesn't throw a console error (open DevTools via `Help > Toggle Developer Tools`)
- Panels and checkboxes are visible

- [ ] **Step 4: Commit**

```bash
cd "/home/ben/GIT/Obsidian/AI UI Manager"
git add extension.js
git commit -m "fix: remove stray 'y' that caused SyntaxError in webview script"
```

---

### Task 2: Clear groupChoice on tab switch

`groupChoice` (dropdown selections) is never cleared in `onTabClick`. After switching tabs and back, the old dropdown selections from a previous tab persist, causing wrong items to appear selected.

**Files:**
- Modify: `extension.js` — `onTabClick` function (around line 518–530)

- [ ] **Step 1: Locate `onTabClick`**

Find this block in the webview `<script>`:
```javascript
function onTabClick(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const nextTab = btn.dataset.tab;
    if (!nextTab || nextTab === selectedTab) return;

    selectedTab = nextTab;
    checked = {};
    document.getElementById('output').value = '';
    document.getElementById('panels').innerHTML = '<div class="empty">Loading…</div>';
    renderTabs();
    vscode.postMessage({ command: 'changeTab', tab: nextTab });
  }
```

- [ ] **Step 2: Add `groupChoice = {}` reset**

Change it to:
```javascript
function onTabClick(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const nextTab = btn.dataset.tab;
    if (!nextTab || nextTab === selectedTab) return;

    selectedTab = nextTab;
    checked = {};
    groupChoice = {};
    document.getElementById('output').value = '';
    document.getElementById('panels').innerHTML = '<div class="empty">Loading…</div>';
    renderTabs();
    vscode.postMessage({ command: 'changeTab', tab: nextTab });
  }
```

- [ ] **Step 3: Verify**

Launch the extension (`F5`). In the Prompt Builder:
1. Switch to a tab that has a panel with multiple items sharing the same label (creating a dropdown).
2. Pick a non-default dropdown option.
3. Switch to a different tab, then switch back.
4. Confirm the dropdown has reset to the first option (not the previously selected one).

- [ ] **Step 4: Commit**

```bash
git add extension.js
git commit -m "fix: clear groupChoice on tab switch to prevent stale dropdown state"
```

---

### Task 3: Fix output textarea — rebuild from state on uncheck

Currently `appendLabelToOutput` only appends. Unchecking a checkbox leaves the label in the textarea. The fix: replace the append-only approach with a `rebuildOutput()` function that reconstructs the textarea from `checked` and `groupChoice` state on every change.

**Files:**
- Modify: `extension.js` — `appendLabelToOutput`, checkbox change handler, select change handler

- [ ] **Step 1: Add `rebuildOutput` function**

Add this function in the webview `<script>`, replacing the existing `appendLabelToOutput` function:

```javascript
  function rebuildOutput() {
    const parts = [];
    sections.forEach(sec => {
      const groups = buildGroups(sec);
      groups.forEach(group => {
        if (!checked[group.groupKey]) return;
        if (group.items.length > 1) {
          const selId = groupChoice[group.groupKey];
          const opt = group.items.find(i => i.id === selId) || group.items[0];
          const txt = (opt.description || opt.full || opt.label).trim();
          if (txt) parts.push(txt);
        } else {
          const txt = (group.items[0].description || group.items[0].full || group.items[0].label).trim();
          if (txt) parts.push(txt);
        }
      });
    });
    document.getElementById('output').value = parts.join('\n');
  }
```

- [ ] **Step 2: Update the checkbox change handler**

Find the existing `change` event listener block that handles checkboxes (around line 461–487). Replace the entire handler block with:

```javascript
  document.getElementById('panels').addEventListener('change', e => {
    const cb = e.target.closest('input[type=checkbox]');
    if (cb) {
      const group = cb.dataset.group;
      const label = cb.dataset.label;
      if (!group || !label) return;
      const select = cb.closest('.item') && cb.closest('.item').querySelector('select.item-select');
      if (select) select.disabled = !cb.checked;
      if (cb.checked) {
        checked[group] = label;
      } else {
        delete checked[group];
      }
      rebuildOutput();
      renderBadges();
      return;
    }

    const select = e.target.closest('select.item-select');
    if (select) {
      const group = select.dataset.group;
      if (!group) return;
      groupChoice[group] = select.value;
      rebuildOutput();
      render();
    }
  });
```

- [ ] **Step 3: Remove the now-unused `appendLabelToOutput` function**

Delete the old function:
```javascript
  function appendLabelToOutput(label) {
    const output = document.getElementById('output');
    const tokens = (output.value || '')
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.includes(label)) return;
    output.value = output.value.trim()
      ? output.value.trim() + ' ' + label
      : label;
  }
```

- [ ] **Step 4: Verify**

Launch extension (`F5`). In Prompt Builder:
1. Check item A. Confirm it appears in textarea.
2. Check item B. Confirm both A and B appear.
3. Uncheck item A. Confirm only B remains.
4. If a dropdown exists: check it, change the dropdown option. Confirm the textarea updates to the new option's text.
5. Click ✕ clear. Confirm textarea empties and all checkboxes reset (existing `clearAll` already resets `checked` and calls `render()`).

- [ ] **Step 5: Commit**

```bash
git add extension.js
git commit -m "fix: rebuild output from state on every change, removing append-only approach"
```

---

### Task 4: Auto-reload when AI_Config.md changes

Currently the user must click ↺ after saving `AI_Config.md`. A VS Code file system watcher fixes this.

**Files:**
- Modify: `extension.js` — `activate()` function and `PromptBuilderViewProvider`

- [ ] **Step 1: Add `_watcher` field and teardown**

In `PromptBuilderViewProvider.constructor`, add:
```javascript
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = null;
    this._selectedTab = null;
    this._watcher = null;
  }
```

- [ ] **Step 2: Start watcher when view resolves**

In `resolveWebviewView`, after the existing `webviewView.onDidChangeVisibility` block, add:

```javascript
    // Watch AI_Config.md for changes and auto-reload
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length) {
      const pattern = new vscode.RelativePattern(workspaceFolders[0], 'AI_Config.md');
      this._watcher = vscode.workspace.createFileSystemWatcher(pattern);
      this._watcher.onDidChange(() => this._loadItems());
      this._watcher.onDidCreate(() => this._loadItems());
      this._watcher.onDidDelete(() => this._loadItems());
    }
```

- [ ] **Step 3: Dispose watcher on view dispose**

Still inside `resolveWebviewView`, add:
```javascript
    webviewView.onDidDispose(() => {
      if (this._watcher) {
        this._watcher.dispose();
        this._watcher = null;
      }
    });
```

- [ ] **Step 4: Verify**

Launch extension (`F5`). Open Prompt Builder. Edit `AI_Config.md` in the workspace (add a new item to a section) and save. Confirm the Prompt Builder panel updates automatically without clicking ↺.

- [ ] **Step 5: Commit**

```bash
git add extension.js
git commit -m "feat: auto-reload panel when AI_Config.md changes via FileSystemWatcher"
```

---

## Self-Review

**Spec coverage:**
- Bug 1 (SyntaxError) → Task 1 ✓
- Bug 2 (stale groupChoice) → Task 2 ✓
- Bug 3 (append-only output) → Task 3 ✓
- Bug 4 (no file watcher) → Task 4 ✓

**Placeholder scan:** No TBDs, no "add appropriate" vagueness. All code shown in full.

**Type consistency:** `groupChoice`, `checked`, `sections`, `buildGroups` used consistently across tasks. `rebuildOutput` introduced in Task 3 only — no earlier task references it.
