const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const CONFIG_SCOPE_KEY = 'crystalContext.configScope';
const CONFIG_FILE = 'crystalcontext_config.md';
const NOTEPAD_FILE = 'crystalcontext_notepad.txt';
const GLOBAL_CONFIG_DIR = '.claude';

// #1: errMsg helper — replaces 6+ inline String(err && err.message ? err.message : err)
function errMsg(e) { return e && e.message ? e.message : String(e); }

class PromptBuilderViewProvider {
  constructor(extensionUri, context) {
    this._extensionUri = extensionUri;
    this._context = context;
    this._view = null;
    this._selectedTab = null;
    this._watcher = null;
    this._isWebviewReady = false;
    this._ensuredDirs = new Set();
  }

  // #4: ensure-once dir creation
  _ensureDir(dir) {
    if (this._ensuredDirs.has(dir)) return;
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    this._ensuredDirs.add(dir);
  }

  _getConfigScope() {
    const v = this._context.globalState.get(CONFIG_SCOPE_KEY);
    return v === 'global' ? 'global' : 'local';
  }

  // #5: shared path resolution — consolidates _resolveConfigPathInfo + _notepadPath
  // Returns { scope, filePath } — filePath is null when local + no workspace open
  _resolveScopedPath(filename) {
    const scope = this._getConfigScope();
    if (scope === 'local') {
      const wf = vscode.workspace.workspaceFolders;
      if (!wf || !wf.length) return { scope, filePath: null };
      return { scope, filePath: path.join(wf[0].uri.fsPath, filename) };
    }
    return { scope, filePath: path.join(os.homedir(), GLOBAL_CONFIG_DIR, filename) };
  }

  // #6: no reason field — callers check !configPath
  _resolveConfigPathInfo() {
    const { scope, filePath } = this._resolveScopedPath(CONFIG_FILE);
    return { scope, configPath: filePath };
  }

  // #5: uses shared _resolveScopedPath
  _notepadPath() {
    const { filePath } = this._resolveScopedPath(NOTEPAD_FILE);
    if (!filePath) throw new Error('No workspace folder open — open a folder for Local notepad, or choose Global (.claude).');
    return filePath;
  }

  _setupConfigWatcher() {
    if (this._watcher) {
      this._watcher.dispose();
      this._watcher = null;
    }
    const info = this._resolveConfigPathInfo();
    if (!info.configPath) return;  // #6: was reason === 'noWorkspace'
    const dir = path.dirname(info.configPath);
    this._ensureDir(dir);  // #7: cached, not mkdirSync every call
    const baseName = path.basename(info.configPath);
    try {
      const pattern = new vscode.RelativePattern(vscode.Uri.file(dir), baseName);
      this._watcher = vscode.workspace.createFileSystemWatcher(pattern);
      this._watcher.onDidChange(() => this._loadItems());
      this._watcher.onDidCreate(() => this._loadItems());
      this._watcher.onDidDelete(() => this._loadItems());
    } catch (e) {
    }
  }

  _syncConfigScopeToWebview() {
    if (!this._view) return;
    this._view.webview.postMessage({ command: 'configScope', scope: this._getConfigScope() });
  }

  // #8: shared try/catch skeleton for all three notepad operations
  async _notepadOp(op) {
    try {
      const p = this._notepadPath();
      await op(p);
    } catch (err) {
      this._view.webview.postMessage({ command: 'notepadError', detail: errMsg(err) });
    }
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    this._isWebviewReady = false;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._loadItems();
      } else {
        // #13: flush pending notepad save before panel hides
        this._view.webview.postMessage({ command: 'panelHidden' });
      }
    });

    webviewView.onDidDispose(() => {
      this._isWebviewReady = false;
      if (this._watcher) {
        this._watcher.dispose();
        this._watcher = null;
      }
    });

    // Register the message channel before _setupConfigWatcher(). If watcher creation throws
    // (e.g. odd path / API edge case), we must still handle webview "ready" or the UI stays on Loading…
    webviewView.webview.onDidReceiveMessage(async msg => {
      switch (msg.command) {
        case 'ready':
          this._isWebviewReady = true;
          this._syncConfigScopeToWebview();
          this._loadItems();
          break;
        case 'setConfigScope':
          if (msg.scope === 'local' || msg.scope === 'global') {
            await this._context.globalState.update(CONFIG_SCOPE_KEY, msg.scope);
            this._setupConfigWatcher();
            this._syncConfigScopeToWebview();
            this._loadItems();
          }
          break;
        case 'refresh':
          this._loadItems();
          break;
        case 'changeTab':
          this._selectedTab = msg.tab || null;
          this._loadItems();
          break;
        case 'sendToChat':
          await this._sendToChat(msg.text);
          break;
        case 'sendToTerminal':
          this._sendToTerminal(msg.text);
          break;
        case 'copyToClipboard':
          await vscode.env.clipboard.writeText(msg.text);
          vscode.window.showInformationMessage('Prompt copied to clipboard!');
          break;
        // #8: notepad ops use shared _notepadOp wrapper
        case 'notepadLoad':
          await this._notepadOp(async p => {
            let text = '';
            try { text = fs.readFileSync(p, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
            this._view.webview.postMessage({ command: 'notepadContent', text, pathLabel: p });
          });
          break;
        case 'saveNotepad':
          await this._notepadOp(p => {
            this._ensureDir(path.dirname(p));  // #9: cached
            fs.writeFileSync(p, msg.text != null ? String(msg.text) : '', 'utf8');
            this._view.webview.postMessage({ command: 'notepadSaved', pathLabel: p });
          });
          break;
        case 'clearNotepad':
          await this._notepadOp(p => {
            this._ensureDir(path.dirname(p));  // #9: cached
            fs.writeFileSync(p, '', 'utf8');
            this._view.webview.postMessage({ command: 'notepadContent', text: '', pathLabel: p });
          });
          break;
        case 'copyNotepad':
          await vscode.env.clipboard.writeText(msg.text != null ? String(msg.text) : '');
          vscode.window.showInformationMessage('Notepad copied to clipboard.');
          break;
      }
    });

    this._setupConfigWatcher();
  }

  _loadItems() {
    if (!this._view || !this._isWebviewReady) return;
    const pathInfo = this._resolveConfigPathInfo();
    const configScope = pathInfo.scope;

    if (!pathInfo.configPath) {  // #6: was reason === 'noWorkspace'
      this._view.webview.postMessage({
        command: 'noWorkspace',
        configScope,
        detail: 'Open a folder to load workspace config, or switch to Global (.claude).'
      });
      return;
    }

    // #10: removed existsSync — ENOENT handled in catch (was TOCTOU)
    const configPath = pathInfo.configPath;
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const yamlText = this._extractYamlBlock(raw);
      const parsed = yaml.load(yamlText);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this._view.webview.postMessage({ command: 'parseError', configScope, detail: 'Root YAML node must be a map of tabs.' });
        return;
      }

      const tabs = Object.keys(parsed);
      if (!tabs.length) {
        this._view.webview.postMessage({ command: 'parseError', configScope, detail: 'No tabs found in crystalcontext_config.md.' });
        return;
      }

      if (!this._selectedTab || !tabs.includes(this._selectedTab)) {
        this._selectedTab = tabs[0];
      }

      const tabConfig = parsed[this._selectedTab];
      const sections = this._sectionsFromTab(this._selectedTab, tabConfig);
      this._view.webview.postMessage({ command: 'loadItems', tabs, selectedTab: this._selectedTab, sections, configScope });
    } catch (err) {
      if (err && err.code === 'ENOENT') {  // #10: file-not-found without existsSync
        const pathLabel = configScope === 'local' ? 'workspace root' : 'your user profile .claude folder';
        this._view.webview.postMessage({ command: 'noFile', configScope, pathLabel, detail: `No ${CONFIG_FILE} in ${pathLabel}.` });
      } else {
        this._view.webview.postMessage({ command: 'parseError', configScope, detail: errMsg(err) });
      }
    }
  }

  _extractYamlBlock(content) {
    const match = content.match(/```(?:yaml-table|yaml|yml)?\s*([\s\S]*?)```/i);
    if (match && match[1]) return match[1].trim();
    return content;
  }

  _sectionsFromTab(tabName, tabConfig) {
    const sections = [];
    if (!tabConfig || typeof tabConfig !== 'object' || Array.isArray(tabConfig)) return sections;
    for (const [panelName, items] of Object.entries(tabConfig)) {
      if (!Array.isArray(items)) continue;
      const section = { title: String(panelName).replace(/_/g, ' '), items: [] };
      for (const [idx, entry] of items.entries()) {
        section.items.push(...this._normalizeEntry(tabName, panelName, entry, idx));
      }
      sections.push(section);
    }
    return sections;
  }

  _normalizeEntry(tabName, panelName, entry, idx) {
    if (typeof entry === 'string') {
      const parsed = this._parseStringEntry(entry);
      if (!parsed.label) return [];
      return [{
        id: this._makeItemId(tabName, panelName, parsed.label, idx),
        label: parsed.label,
        description: parsed.description,
        full: parsed.body,
        singleOutput: parsed.label,
        optionLabel: parsed.description || parsed.body || parsed.label,
        optionValue: parsed.description,
        control: null
      }];
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const label = String(entry.label || '').trim();
    if (!label) return [];
    const description = String(entry.description || '').trim();
    const singleOutput = String(entry.value || label).trim() || label;
    const explicitControl = String(entry.control || '').trim().toLowerCase();
    const control = explicitControl === 'select' || explicitControl === 'dropdown'
      ? 'select'
      : explicitControl === 'checkbox'
        ? 'checkbox'
        : explicitControl === 'radio'
          ? 'radio'
          : null;
    if (Array.isArray(entry.options) && entry.options.length) {
      return entry.options
        .map((option, optIdx) => this._normalizeOption(tabName, panelName, label, option, idx, optIdx, control))
        .filter(Boolean);
    }
    return [{
      id: this._makeItemId(tabName, panelName, label, idx),
      label, description,
      full: description ? `${label}: ${description}` : label,
      singleOutput,
      optionLabel: description || label,
      optionValue: '',
      control
    }];
  }

  _normalizeOption(tabName, panelName, label, option, idx, optIdx, control) {
    if (typeof option === 'string') {
      const value = option.trim();
      if (!value) return null;
      return {
        id: this._makeItemId(tabName, panelName, `${label}_${value}`, `${idx}_${optIdx}`),
        label, description: value, full: `${label} ${value}`.trim(),
        singleOutput: label, optionLabel: value, optionValue: value, control
      };
    }
    if (!option || typeof option !== 'object' || Array.isArray(option)) return null;
    const optionLabel = String(option.label || option.value || '').trim();
    const optionValue = String(option.value || option.label || '').trim();
    if (!optionLabel && !optionValue) return null;
    return {
      id: this._makeItemId(tabName, panelName, `${label}_${optionValue || optionLabel}`, `${idx}_${optIdx}`),
      label, description: optionLabel, full: `${label} ${optionValue || optionLabel}`.trim(),
      singleOutput: label, optionLabel: optionLabel || optionValue, optionValue: optionValue || optionLabel, control
    };
  }

  _parseStringEntry(entry) {
    const body = String(entry).trim();
    if (!body) return { body: '', label: '', description: '' };
    const colonIdx = body.indexOf(':');
    let label = body, description = '';
    if (colonIdx !== -1) {
      label = body.substring(0, colonIdx).trim();
      description = body.substring(colonIdx + 1).trim();
    } else {
      const spaceIdx = body.indexOf(' ');
      if (spaceIdx !== -1) {
        label = body.substring(0, spaceIdx).trim();
        description = body.substring(spaceIdx + 1).trim();
      }
    }
    return { body, label, description };
  }

  _makeItemId(tabName, panelName, label, idx) {
    return `${tabName}_${panelName}_${label}_${idx}`.replace(/\s+/g, '_');
  }

  async _sendToChat(text) {
    // Try VS Code Copilot Chat, then Cursor Composer, then clipboard fallback
    const attempts = [
      () => vscode.commands.executeCommand('workbench.action.chat.open', { query: text }),
      () => vscode.commands.executeCommand('workbench.action.chat.open', text),
      () => vscode.commands.executeCommand('composer.startComposerPrompt', { message: text }),
      () => vscode.commands.executeCommand('aichat.newchataction', text),
    ];
    let lastErr;
    for (const attempt of attempts) {
      try { await attempt(); return; } catch (e) { lastErr = e; }
    }
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage('Chat unavailable — prompt copied to clipboard.');
  }

  _sendToTerminal(text) {
    const terminal = vscode.window.activeTerminal
      ?? vscode.window.createTerminal('Crystal Context');
    terminal.show();
    terminal.sendText(text, false);  // type into the prompt, let the user press Enter
  }

  _getHtml() {
    const nonce = crypto.randomBytes(16).toString('base64');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Crystal Context</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 8px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  .top-bar {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
  }

  .config-scope-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 4px 0 6px;
    border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
    margin-bottom: 4px;
    font-size: 11px;
    flex-shrink: 0;
  }

  .config-scope-row .scope-label {
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    margin-right: 4px;
  }

  .scope-radio-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35));
    cursor: pointer;
    user-select: none;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .scope-radio-label:hover { background: var(--vscode-list-hoverBackground); }
  .scope-radio-label.scope-radio-selected {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-input-background);
    font-weight: 600;
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }
  /* Native radio dots are often invisible in webviews; draw a clear checked state. */
  .config-scope-row input[type=radio] {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin: 0;
    cursor: pointer;
    flex-shrink: 0;
    border-radius: 50%;
    border: 1.5px solid var(--vscode-widget-border, rgba(128,128,128,0.45));
    background-color: var(--vscode-input-background);
    background-image: none;
  }
  .config-scope-row input[type=radio]:checked {
    border-color: var(--vscode-focusBorder);
    background-color: var(--vscode-focusBorder);
    /* High-contrast center dot (radial alone can disappear in some webviews) */
    background-image: radial-gradient(
      circle at center,
      var(--vscode-sideBar-background, var(--vscode-editor-background)) 0,
      var(--vscode-sideBar-background, var(--vscode-editor-background)) 36%,
      transparent 37%
    );
  }
  .config-scope-row input[type=radio]:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  .tabs-bar {
    display: flex;
    gap: 4px;
    min-width: 0;
    overflow-x: auto;
  }

  .tab-btn {
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.3));
    padding: 3px 8px;
    cursor: pointer;
    font-size: 11px;
    border-radius: 10px;
    white-space: nowrap;
  }
  .tab-btn.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .tab-btn:hover { background: var(--vscode-list-hoverBackground); }

  .top-bar button {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 3px 8px;
    cursor: pointer;
    font-size: 11px;
    border-radius: 2px;
  }
  .top-bar button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .spacer { flex: 1; }

  .panels {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
  }

  .panel {
    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .panel-header {
    background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.1));
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
  }
  .panel-header:hover { background: var(--vscode-list-hoverBackground); }

  .chevron { font-size: 9px; transition: transform 0.15s; opacity: 0.7; }
  .panel.collapsed .chevron { transform: rotate(-90deg); }
  .panel.collapsed .panel-body { display: none; }

  .panel-body { padding: 4px 0; }

  .item {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 4px 10px;
    cursor: pointer;
    border-radius: 2px;
  }
  .item:hover { background: var(--vscode-list-hoverBackground); }

  .item input[type=checkbox] {
    flex-shrink: 0;
    cursor: pointer;
    accent-color: var(--vscode-focusBorder);
    margin-top: 1px;
  }

  .item-radio-group { flex-wrap: wrap; align-items: flex-start; cursor: default; }
  .item-radio-group:hover { background: transparent; }

  .item-radio-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    align-items: center;
    margin-left: auto;
    flex: 1;
    min-width: 0;
    justify-content: flex-end;
  }

  .item-radio {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    font-size: 11px;
    color: var(--vscode-foreground);
    user-select: none;
  }
  .item-radio input[type=radio] {
    cursor: pointer;
    accent-color: var(--vscode-focusBorder);
    margin: 0;
    flex-shrink: 0;
  }

  .item-label { font-size: 12px; font-weight: 500; color: var(--vscode-foreground); white-space: nowrap; flex-shrink: 0; }

  .item-desc {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-select {
    margin-left: auto;
    min-width: 120px;
    max-width: 45%;
    background: var(--vscode-dropdown-background, var(--vscode-input-background));
    color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground));
    border: 1px solid var(--vscode-dropdown-border, rgba(128,128,128,0.3));
    border-radius: 2px;
    font-size: 11px;
    padding: 2px 4px;
  }

  .badge {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    font-size: 9px;
    padding: 0 5px;
    border-radius: 8px;
    font-weight: 700;
    min-width: 16px;
    text-align: center;
  }

  /* Assembled prompt — fixed height so it does not swallow the panel */
  .output-section {
    flex: 0 0 auto;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-height: 0;
  }

  .output-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--vscode-descriptionForeground);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .output-label a { color: var(--vscode-descriptionForeground); cursor: pointer; text-decoration: none; font-weight: 400; }
  .output-label a:hover { color: var(--vscode-foreground); }

  textarea {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
    padding: 6px;
    font-size: 11px;
    font-family: var(--vscode-editor-font-family, monospace);
    border-radius: 3px;
    outline: none;
    line-height: 1.5;
  }
  #output {
    height: 75px;
    min-height: 75px;
    max-height: 75px;
    flex: 0 0 auto;
    resize: none;
    overflow-y: auto;
    box-sizing: border-box;
  }
  textarea:focus { border-color: var(--vscode-focusBorder); }

  .notepad-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; flex-shrink: 0; }
  .notepad-path {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-left: auto;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .notepad-panel-inner { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 8px; height: 100%; }
  .notepad-editor {
    flex: 1;
    min-height: 8rem;
    width: 100%;
    resize: vertical;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
    padding: 8px;
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    line-height: 1.45;
    border-radius: 3px;
    outline: none;
  }
  .notepad-editor:focus { border-color: var(--vscode-focusBorder); }
  .notepad-error { flex-shrink: 0; padding: 6px 4px; color: var(--vscode-errorForeground); font-size: 11px; line-height: 1.4; }

  .action-row { display: flex; gap: 4px; }

  .btn-primary {
    flex: 1;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 12px;
    border-radius: 3px;
    font-weight: 500;
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 12px;
    border-radius: 3px;
  }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

  .empty { padding: 20px 10px; text-align: center; color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.7; }
</style>
</head>
<body>

<div class="config-scope-row" id="configScopeRow" title="Where to load crystalcontext_config.md from">
  <span class="scope-label">Config</span>
  <label class="scope-radio-label" id="labelScopeLocal"><input type="radio" name="configScope" id="radioScopeLocal" value="local"><span> Local (project root)</span></label>
  <label class="scope-radio-label" id="labelScopeGlobal"><input type="radio" name="configScope" id="radioScopeGlobal" value="global"><span> Global (.claude)</span></label>
</div>

<div class="top-bar">
  <div id="tabsBar" class="tabs-bar" title="Select workflow tab"></div>
  <div class="spacer"></div>
  <button id="btnReload" title="Reload crystalcontext_config.md and clear selections">↺</button>
</div>

<div class="panels" id="panels">
  <div class="empty">Loading…</div>
</div>

<div class="output-section">
  <div class="output-label">
    <span>Assembled Prompt</span>
    <a id="btnClear" style="cursor:pointer;">✕ clear</a>
  </div>
  <textarea id="output" placeholder="Check items above…" spellcheck="false"></textarea>
  <div class="action-row">
    <button class="btn-primary" id="btnSend">⬆ Send to Chat</button>
    <button class="btn-secondary" id="btnSendTerminal">⮞ Send to Terminal</button>
    <button class="btn-secondary" id="btnCopy">Copy</button>
  </div>
</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  let sections = [];
  let tabs = [];
  let selectedTab = '';
  let checked = {};
  let groupChoice = {};
  let sectionGroupKeys = {};
  let selectedGroups = [];
  let userSuffix = '';
  let syncingOutput = false;
  // #14: removed configScope variable — dead state; scope is owned by radio DOM
  let notepadSaveTimer = null;
  // #16: cache built groups after render() so getGroupOutput doesn't rebuild per call
  let builtGroupsMap = {};
  // #10: isNotepad cached boolean — invalidated via updateSelectedTab
  let isNotepad = false;

  // #10: update selectedTab and cached isNotepad together
  function updateSelectedTab(tab) {
    selectedTab = tab || '';
    isNotepad = selectedTab.trim().replace(/\\s+/g, ' ').toLowerCase() === 'notepad';
  }

  function applyScopeToRadios(scope) {
    const local = document.getElementById('radioScopeLocal');
    const g = document.getElementById('radioScopeGlobal');
    const ll = document.getElementById('labelScopeLocal');
    const lg = document.getElementById('labelScopeGlobal');
    if (!local || !g) return;
    const s = scope === 'global' ? 'global' : 'local';
    // #14: no configScope variable update
    local.checked = s === 'local';
    g.checked = s === 'global';
    if (ll) ll.classList.toggle('scope-radio-selected', s === 'local');
    if (lg) lg.classList.toggle('scope-radio-selected', s === 'global');
  }

  const scopeRow = document.getElementById('configScopeRow');
  if (scopeRow) {
    scopeRow.addEventListener('change', e => {
      const t = e.target;
      if (t && t.name === 'configScope' && (t.value === 'local' || t.value === 'global')) {
        vscode.postMessage({ command: 'setConfigScope', scope: t.value });
      }
    });
  }

  document.getElementById('panels').addEventListener('input', e => {
    if (e.target && e.target.id === 'notepadEditor') {
      clearTimeout(notepadSaveTimer);
      notepadSaveTimer = setTimeout(() => {
        const ta = document.getElementById('notepadEditor');
        vscode.postMessage({ command: 'saveNotepad', text: ta ? ta.value : '' });
      }, 400);
    }
  });

  document.getElementById('tabsBar').addEventListener('click', onTabClick);
  document.getElementById('btnReload').addEventListener('click', handleReload);
  document.getElementById('btnClear').addEventListener('click', clearAll);
  document.getElementById('btnSend').addEventListener('click', sendToChat);
  document.getElementById('btnSendTerminal').addEventListener('click', sendToTerminal);
  document.getElementById('btnCopy').addEventListener('click', copyPrompt);
  document.getElementById('output').addEventListener('input', e => {
    if (syncingOutput) return;
    const raw = normalizeOutput(e.target.value);
    const generated = buildGeneratedOutput();
    if (!generated) { userSuffix = raw; return; }
    if (raw === generated) { userSuffix = ''; return; }
    if (raw.startsWith(generated + ' ')) { userSuffix = normalizeOutput(raw.slice(generated.length)); return; }
    userSuffix = raw;
  });

  document.getElementById('panels').addEventListener('click', e => {
    if (e.target.closest('#notepadCopy')) {
      const ta = document.getElementById('notepadEditor');
      vscode.postMessage({ command: 'copyNotepad', text: ta ? ta.value : '' });
      return;
    }
    if (e.target.closest('#notepadClear')) {
      vscode.postMessage({ command: 'clearNotepad' });
      return;
    }
    const header = e.target.closest('.panel-header');
    if (header) {
      const panel = header.closest('.panel');
      if (panel) panel.classList.toggle('collapsed');
      return;
    }
    if (!e.target.closest('.item-radio-group') && !e.target.closest('input[type=checkbox]') && !e.target.closest('select')) {
      const item = e.target.closest('.item[data-item-group]');
      if (item) {
        const cb = item.querySelector('input[type=checkbox]');
        if (cb) cb.click();
      }
    }
  });

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
        if (!selectedGroups.includes(group)) selectedGroups.push(group);
      } else {
        delete checked[group];
        selectedGroups = selectedGroups.filter(key => key !== group);
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
      return;
    }

    const rad = e.target.closest('input.item-radio-input');
    if (rad && rad.checked) {
      const group = rad.dataset.group;
      const label = rad.dataset.label;
      const optId = rad.dataset.optId;
      if (!group || !label || !optId) return;
      groupChoice[group] = optId;
      checked[group] = label;
      if (!selectedGroups.includes(group)) selectedGroups.push(group);
      rebuildOutput();
      renderBadges();
    }
  });

  window.addEventListener('message', e => {
    const { command, sections: s, tabs: t, selectedTab: activeTab, detail } = e.data;
    // #13: hoisted — fires for any message that carries configScope (loadItems, noWorkspace, noFile, parseError)
    if (e.data.configScope) applyScopeToRadios(e.data.configScope);

    if (command === 'configScope') {
      applyScopeToRadios(e.data.scope);
      // #15: no explicit notepadLoad here — _loadItems fires next; render() handles it
    } else if (command === 'panelHidden') {
      // #13: flush pending notepad save before panel hides
      if (notepadSaveTimer !== null) {
        clearTimeout(notepadSaveTimer);
        notepadSaveTimer = null;
        const ta = document.getElementById('notepadEditor');
        if (ta) vscode.postMessage({ command: 'saveNotepad', text: ta.value });
      }
    } else if (command === 'notepadContent') {
      const ta = document.getElementById('notepadEditor');
      const hint = document.getElementById('notepadPathHint');
      const errEl = document.getElementById('notepadError');
      if (ta) ta.value = e.data.text != null ? e.data.text : '';
      if (hint && e.data.pathLabel) hint.textContent = e.data.pathLabel;
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
    } else if (command === 'notepadError') {
      const errEl = document.getElementById('notepadError');
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = esc(e.data.detail || 'Could not load or save notepad.'); }
    } else if (command === 'notepadSaved') {
      const errEl = document.getElementById('notepadError');
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
      const hint = document.getElementById('notepadPathHint');
      if (hint && e.data.pathLabel) hint.textContent = e.data.pathLabel;
    } else if (command === 'loadItems') {
      tabs = Array.isArray(t) ? t : [];
      updateSelectedTab(activeTab);  // #10: caches isNotepad
      sections = Array.isArray(s) ? s : [];
      renderTabs();
      render();
    } else if (command === 'noWorkspace') {
      const msg = detail || 'No workspace folder open. Open a folder for Local config, or choose Global (.claude).';
      document.getElementById('panels').innerHTML = '<div class="empty">' + esc(msg) + '</div>';
    } else if (command === 'noFile') {
      const hint = e.data.detail || ('No crystalcontext_config.md in ' + (e.data.pathLabel || 'the selected location') + '.');
      document.getElementById('panels').innerHTML = '<div class="empty">' + esc(hint) + '</div>';
    } else if (command === 'parseError') {
      document.getElementById('panels').innerHTML =
        '<div class="empty">Failed to parse crystalcontext_config.md<br>' + esc(detail || 'Unknown error') + '</div>';
    }
  });

  function renderTabs() {
    const tabsBar = document.getElementById('tabsBar');
    tabsBar.innerHTML = tabs.map(tab => {
      const active = tab === selectedTab ? ' active' : '';
      return '<button class="tab-btn' + active + '" data-tab="' + esc(tab) + '">' + esc(tab) + '</button>';
    }).join('');
  }

  function onTabClick(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const nextTab = btn.dataset.tab;
    if (!nextTab || nextTab === selectedTab) return;

    updateSelectedTab(nextTab);  // #10: caches isNotepad
    groupChoice = {};
    resetSelections();  // #18
    document.getElementById('panels').innerHTML = '<div class="empty">Loading…</div>';
    renderTabs();
    vscode.postMessage({ command: 'changeTab', tab: nextTab });
  }

  function render() {
    const container = document.getElementById('panels');
    sectionGroupKeys = {};
    builtGroupsMap = {};  // #16: invalidate cache on re-render
    if (isNotepad) {  // #10: cached boolean
      container.innerHTML =
        '<div class="notepad-panel-inner">' +
        '<div class="notepad-toolbar">' +
        '<button type="button" class="btn-secondary" id="notepadCopy">Copy</button>' +
        '<button type="button" class="btn-secondary" id="notepadClear">Clear</button>' +
        '<span class="notepad-path" id="notepadPathHint" title="Notepad file path"></span>' +
        '</div>' +
        '<textarea id="notepadEditor" class="notepad-editor" spellcheck="false" placeholder="Saves to crystalcontext_notepad.txt (Local = project root, Global = ~/.claude). Debounced save while typing."></textarea>' +
        '<div id="notepadError" class="notepad-error" style="display:none;"></div>' +
        '</div>';
      vscode.postMessage({ command: 'notepadLoad' });
      return;
    }
    if (!sections.length) {
      const suffix = selectedTab ? ' for tab ' + esc(selectedTab) : '';
      container.innerHTML = '<div class="empty">No sections found in crystalcontext_config.md' + suffix + '.</div>';
      return;
    }

    let html = '';
    sections.forEach(sec => {
      const groups = buildGroups(sec);
      groups.forEach(group => {
        builtGroupsMap[group.groupKey] = group;  // #16: populate cache
        if (!groupChoice[group.groupKey] || !group.items.some(i => i.id === groupChoice[group.groupKey])) {
          groupChoice[group.groupKey] = group.selectedId;
        }
        if (group.control === 'radio') {
          if (!checked[group.groupKey]) {
            checked[group.groupKey] = group.label;
            if (!selectedGroups.includes(group.groupKey)) selectedGroups.push(group.groupKey);
          }
        }
      });
      sectionGroupKeys[sec.title] = groups.map(g => g.groupKey);
      const checkedCount = groups.filter(g => checked[g.groupKey]).length;

      html += '<div class="panel" id="panel-' + esc(sec.title) + '">';
      html += '<div class="panel-header"><span>' + esc(sec.title) + '</span>';
      html += '<span style="display:flex;gap:5px;align-items:center;">';
      if (checkedCount) html += '<span class="badge">' + checkedCount + '</span>';
      html += '<span class="chevron">▾</span></span></div>';
      html += '<div class="panel-body">';

      groups.forEach(group => {
        const isRadio = group.control === 'radio';
        html += '<div class="item' + (isRadio ? ' item-radio-group' : '') + '" data-item-group="' + esc(group.groupKey) + '">';
        if (isRadio) {
          html += '<span class="item-label">' + esc(group.label) + '</span>';
          html += '<div class="item-radio-options">';
          const gname = 'rg_' + String(group.groupKey).replace(/[^a-zA-Z0-9_]/g, '_');
          const sel = groupChoice[group.groupKey] || group.selectedId;
          group.items.forEach(opt => {
            const txt = opt.optionLabel || opt.description || opt.full || opt.label;
            html += '<label class="item-radio"><input type="radio" class="item-radio-input" name="' + esc(gname) + '" data-group="' + esc(group.groupKey) + '" data-opt-id="' + esc(opt.id) + '" data-label="' + esc(group.label) + '"';
            if (sel === opt.id) html += ' checked';
            html += '><span>' + esc(txt) + '</span></label>';
          });
          html += '</div>';
        } else {
          html += '<input type="checkbox" data-group="' + esc(group.groupKey) + '" data-label="' + esc(group.label) + '"';
          if (checked[group.groupKey]) html += ' checked';
          html += '>';
          html += '<span class="item-label">' + esc(group.label) + '</span>';
          if (group.control === 'select') {
            html += '<select class="item-select" data-group="' + esc(group.groupKey) + '"';
            if (!checked[group.groupKey]) html += ' disabled';
            html += '>';
            group.items.forEach(opt => {
              const txt = opt.optionLabel || opt.description || opt.full || opt.label;
              html += '<option value="' + esc(opt.id) + '"';
              if (opt.id === group.selectedId) html += ' selected';
              html += '>' + esc(txt) + '</option>';
            });
            html += '</select>';
          } else if (group.items[0].description) {
            html += '<span class="item-desc">' + esc(group.items[0].description) + '</span>';
          }
        }
        html += '</div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function renderBadges() {
    if (isNotepad) return;  // #10: cached boolean
    sections.forEach(sec => {
      const panel = document.getElementById('panel-' + esc(sec.title));
      if (!panel) return;
      const header = panel.querySelector('.panel-header span:last-child');
      const keys = sectionGroupKeys[sec.title] || [];
      const count = keys.filter(k => checked[k]).length;
      const chevron = header.querySelector('.chevron');
      const existing = header.querySelector('.badge');
      if (existing) existing.remove();
      if (count) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = count;
        header.insertBefore(badge, chevron);
      }
    });
  }

  function buildGroups(sec) {
    const grouped = new Map();
    sec.items.forEach(item => {
      const groupKey = selectedTab + '::' + sec.title + '::' + item.label;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { groupKey, label: item.label, items: [], control: item.control || null, singleOutput: item.singleOutput || item.label });
      }
      const group = grouped.get(groupKey);
      if (!group.control && item.control) group.control = item.control;
      if (!group.singleOutput && item.singleOutput) group.singleOutput = item.singleOutput;
      group.items.push(item);
    });

    return Array.from(grouped.values()).map(group => {
      let control;
      if (group.control === 'radio') { control = 'radio'; }
      else if (group.control === 'select' || group.items.length > 1) { control = 'select'; }
      else { control = 'checkbox'; }
      const hasSelected = groupChoice[group.groupKey] && group.items.some(i => i.id === groupChoice[group.groupKey]);
      const selectedId = hasSelected ? groupChoice[group.groupKey] : group.items[0].id;
      return { ...group, control, selectedId };
    });
  }

  // #16: uses builtGroupsMap — no buildGroups calls per output rebuild
  function getGroupOutput(groupKey) {
    const group = builtGroupsMap[groupKey];
    if (!group) return '';
    let txt = String(group.singleOutput || group.label || '').trim();
    if (group.control === 'radio') {
      const selId = groupChoice[group.groupKey];
      const opt = group.items.find(i => i.id === selId) || group.items[0];
      return String(opt.optionValue || opt.description || opt.full || '').trim() || txt;
    }
    if (group.control === 'select') {
      const selId = groupChoice[group.groupKey];
      const opt = group.items.find(i => i.id === selId) || group.items[0];
      const value = String(opt.optionValue || opt.description || '').trim();
      if (txt && value) txt += ' ' + value;
      else if (!txt) txt = value;
    }
    return txt;
  }

  function normalizeOutput(text) {
    return String(text || '').replace(/\\s+/g, ' ').trim();
  }

  // #17: removed seen Set — selectedGroups already deduped at push time
  function buildGeneratedOutput() {
    const parts = [];
    selectedGroups.forEach(groupKey => {
      if (!checked[groupKey]) return;
      const txt = getGroupOutput(groupKey);
      if (txt) parts.push(txt);
    });
    return parts.join(' ');
  }

  function rebuildOutput() {
    const parts = [];
    const generated = buildGeneratedOutput();
    if (generated) parts.push(generated);
    if (userSuffix) parts.push(userSuffix);
    syncingOutput = true;
    document.getElementById('output').value = normalizeOutput(parts.join(' '));
    syncingOutput = false;
  }

  // #18: shared reset extracted from clearAll and handleReload
  function resetSelections() {
    checked = {};
    selectedGroups = [];
    userSuffix = '';
    document.getElementById('output').value = '';
  }

  function clearAll() {
    resetSelections();
    render();
  }

  function handleReload() {
    resetSelections();
    document.getElementById('panels').innerHTML = '<div class="empty">Loading…</div>';
    vscode.postMessage({ command: 'refresh' });
  }

  function sendToChat() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'sendToChat', text });
  }

  function sendToTerminal() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'sendToTerminal', text });
  }

  function copyPrompt() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'copyToClipboard', text });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Always notify the host synchronously at end of script. In some webviews, DOMContentLoaded /
  // load already fired before these listeners were registered, or never fire — then nothing loads.
  (function scheduleWebviewReady() {
    let done = false;  // #11: closure variable instead of window.__ccReadyDone
    function send() {
      if (done) return;
      done = true;
      try {
        vscode.postMessage({ command: 'ready' });
      } catch (_) {}
    }
    send();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', send);
      window.addEventListener('load', send);
    }
  })();
</script>
</body>
</html>`;
  }
}

function activate(context) {
  const provider = new PromptBuilderViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('promptBuilderView', provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('promptBuilder.openPanel', () => {
      vscode.commands.executeCommand('promptBuilderView.focus');
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      provider._setupConfigWatcher();
      if (provider._isWebviewReady) {
        provider._loadItems();
      }
    })
  );
}

function deactivate() {}
module.exports = { activate, deactivate };
