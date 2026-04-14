const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class PromptBuilderViewProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = null;
    this._selectedTab = null;
    this._watcher = null;
    this._isWebviewReady = false;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    this._isWebviewReady = false;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) this._loadItems();
    });

    // Auto-reload when AI_Config.md changes
    if (this._watcher) { this._watcher.dispose(); this._watcher = null; }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length) {
      const pattern = new vscode.RelativePattern(workspaceFolders[0], 'AI_Config.md');
      this._watcher = vscode.workspace.createFileSystemWatcher(pattern);
      this._watcher.onDidChange(() => this._loadItems());
      this._watcher.onDidCreate(() => this._loadItems());
      this._watcher.onDidDelete(() => this._loadItems());
    }

    webviewView.onDidDispose(() => {
      this._isWebviewReady = false;
      if (this._watcher) {
        this._watcher.dispose();
        this._watcher = null;
      }
    });

    webviewView.webview.onDidReceiveMessage(async msg => {
      switch (msg.command) {
        case 'ready':
          this._isWebviewReady = true;
          // Webview signals it's ready — now safe to send data.
          this._loadItems();
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
        case 'copyToClipboard':
          await vscode.env.clipboard.writeText(msg.text);
          vscode.window.showInformationMessage('Prompt copied to clipboard!');
          break;
      }
    });
  }

  _loadItems() {
    if (!this._view || !this._isWebviewReady) return;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const root = workspaceFolders && workspaceFolders.length
      ? workspaceFolders[0].uri.fsPath
      : this._extensionUri.fsPath;
    const configPath = path.join(root, 'AI_Config.md');

    if (!fs.existsSync(configPath)) {
      if (!workspaceFolders || !workspaceFolders.length) {
        this._view.webview.postMessage({ command: 'noWorkspace' });
      } else {
        this._view.webview.postMessage({ command: 'noFile' });
      }
      return;
    }

    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const yamlText = this._extractYamlBlock(raw);
      const parsed = yaml.load(yamlText);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this._view.webview.postMessage({ command: 'parseError', detail: 'Root YAML node must be a map of tabs.' });
        return;
      }

      const tabs = Object.keys(parsed);
      if (!tabs.length) {
        this._view.webview.postMessage({ command: 'parseError', detail: 'No tabs found in AI_Config.md.' });
        return;
      }

      if (!this._selectedTab || !tabs.includes(this._selectedTab)) {
        this._selectedTab = tabs[0];
      }

      const tabConfig = parsed[this._selectedTab];
      const sections = this._sectionsFromTab(this._selectedTab, tabConfig);
      this._view.webview.postMessage({
        command: 'loadItems',
        tabs,
        selectedTab: this._selectedTab,
        sections
      });
    } catch (err) {
      this._view.webview.postMessage({ command: 'parseError', detail: String(err && err.message ? err.message : err) });
    }
  }

  _extractYamlBlock(content) {
    const match = content.match(/```(?:yaml-table|yaml|yml)?\s*([\s\S]*?)```/i);
    if (match && match[1]) return match[1].trim();
    return content;
  }

  _sectionsFromTab(tabName, tabConfig) {
    const sections = [];
    if (!tabConfig || typeof tabConfig !== 'object' || Array.isArray(tabConfig)) {
      return sections;
    }

    for (const [panelName, items] of Object.entries(tabConfig)) {
      if (!Array.isArray(items)) continue;
      const section = {
        title: String(panelName).replace(/_/g, ' '),
        items: []
      };

      for (const [idx, entry] of items.entries()) {
        const normalizedItems = this._normalizeEntry(tabName, panelName, entry, idx);
        section.items.push(...normalizedItems);
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

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }

    const label = String(entry.label || '').trim();
    if (!label) return [];

    const description = String(entry.description || '').trim();
    const singleOutput = String(entry.value || label).trim() || label;
    const explicitControl = String(entry.control || '').trim().toLowerCase();
    const control = explicitControl === 'select' || explicitControl === 'dropdown'
      ? 'select'
      : explicitControl === 'checkbox'
        ? 'checkbox'
        : null;

    if (Array.isArray(entry.options) && entry.options.length) {
      return entry.options
        .map((option, optIdx) => this._normalizeOption(tabName, panelName, label, option, idx, optIdx, control))
        .filter(Boolean);
    }

    return [{
      id: this._makeItemId(tabName, panelName, label, idx),
      label,
      description,
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
        label,
        description: value,
        full: `${label} ${value}`.trim(),
        singleOutput: label,
        optionLabel: value,
        optionValue: value,
        control
      };
    }

    if (!option || typeof option !== 'object' || Array.isArray(option)) {
      return null;
    }

    const optionLabel = String(option.label || option.value || '').trim();
    const optionValue = String(option.value || option.label || '').trim();
    if (!optionLabel && !optionValue) return null;

    return {
      id: this._makeItemId(tabName, panelName, `${label}_${optionValue || optionLabel}`, `${idx}_${optIdx}`),
      label,
      description: optionLabel,
      full: `${label} ${optionValue || optionLabel}`.trim(),
      singleOutput: label,
      optionLabel: optionLabel || optionValue,
      optionValue: optionValue || optionLabel,
      control
    };
  }

  _parseStringEntry(entry) {
    const body = String(entry).trim();
    if (!body) {
      return { body: '', label: '', description: '' };
    }

    const colonIdx = body.indexOf(':');
    let label = body;
    let description = '';
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
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', { query: text });
    } catch {
      const doc = await vscode.workspace.openTextDocument({ content: text, language: 'markdown' });
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage('Copilot Chat not available — opened in editor instead.');
    }
  }

  _getHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
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

  .tab-btn:hover {
    background: var(--vscode-list-hoverBackground);
  }
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

  .chevron {
    font-size: 9px;
    transition: transform 0.15s;
    opacity: 0.7;
  }
  .panel.collapsed .chevron { transform: rotate(-90deg); }
  .panel.collapsed .panel-body { display: none; }

  .panel-body {
    padding: 4px 0;
  }

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

  .item-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
    white-space: nowrap;
    flex-shrink: 0;
  }

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

  /* Prompt output area */
  .output-section {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
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
  .output-label a {
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    text-decoration: none;
    font-weight: 400;
  }
  .output-label a:hover { color: var(--vscode-foreground); }

  textarea {
    width: 100%;
    height: 90px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
    padding: 6px;
    font-size: 11px;
    font-family: var(--vscode-editor-font-family, monospace);
    resize: vertical;
    border-radius: 3px;
    outline: none;
    line-height: 1.5;
  }
  textarea:focus { border-color: var(--vscode-focusBorder); }

  .action-row {
    display: flex;
    gap: 4px;
  }

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

  .empty {
    padding: 20px 10px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    line-height: 1.7;
  }
</style>
</head>
<body>

<div class="top-bar">
  <div id="tabsBar" class="tabs-bar" title="Select workflow tab"></div>
  <div class="spacer"></div>
  <button id="btnReload" title="Reload AI_Config.md and clear selections">↺</button>
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
    <button class="btn-secondary" id="btnCopy">Copy</button>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let sections = [];
  let tabs = [];
  let selectedTab = '';
  let checked = {};  // groupKey -> label
  let groupChoice = {}; // groupKey -> selected item id for duplicate keys
  let sectionGroupKeys = {};
  let selectedGroups = [];
  let userSuffix = '';
  let syncingOutput = false;

  // Wire up static buttons via addEventListener
  document.getElementById('tabsBar').addEventListener('click', onTabClick);
  document.getElementById('btnReload').addEventListener('click', handleReload);
  document.getElementById('btnClear').addEventListener('click', clearAll);
  document.getElementById('btnSend').addEventListener('click', sendToChat);
  document.getElementById('btnCopy').addEventListener('click', copyPrompt);
  document.getElementById('output').addEventListener('input', e => {
    if (syncingOutput) return;
    const raw = normalizeOutput(e.target.value);
    const generated = buildGeneratedOutput();
    if (!generated) {
      userSuffix = raw;
      return;
    }

    if (raw === generated) {
      userSuffix = '';
      return;
    }

    if (raw.startsWith(generated + ' ')) {
      userSuffix = normalizeOutput(raw.slice(generated.length));
      return;
    }

    userSuffix = raw;
  });

  // Event delegation for dynamically rendered panels and checkboxes
  document.getElementById('panels').addEventListener('click', e => {
    const header = e.target.closest('.panel-header');
    if (header) {
      const panel = header.closest('.panel');
      if (panel) panel.classList.toggle('collapsed');
      return;
    }
    // Click on item row (but not on checkbox/select) toggles checkbox
    if (!e.target.closest('input[type=checkbox]') && !e.target.closest('select')) {
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
    }
  });

  window.addEventListener('message', e => {
    const { command, sections: s, tabs: t, selectedTab: activeTab, detail } = e.data;
    if (command === 'loadItems') {
      tabs = Array.isArray(t) ? t : [];
      selectedTab = activeTab || '';
      sections = Array.isArray(s) ? s : [];
      renderTabs();
      render();
    } else if (command === 'noWorkspace') {
      document.getElementById('panels').innerHTML =
        '<div class="empty">No workspace folder open and no fallback AI_Config.md was found.</div>';
    } else if (command === 'noFile') {
      document.getElementById('panels').innerHTML =
        '<div class="empty">No AI_Config.md found<br>in workspace root.</div>';
    } else if (command === 'parseError') {
      document.getElementById('panels').innerHTML =
        '<div class="empty">Failed to parse AI_Config.md<br>' + esc(detail || 'Unknown error') + '</div>';
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

    selectedTab = nextTab;
    checked = {};
    groupChoice = {};
    selectedGroups = [];
    userSuffix = '';
    document.getElementById('output').value = '';
    document.getElementById('panels').innerHTML = '<div class="empty">Loading…</div>';
    renderTabs();
    vscode.postMessage({ command: 'changeTab', tab: nextTab });
  }

  function render() {
    const container = document.getElementById('panels');
    sectionGroupKeys = {};
    if (!sections.length) {
      const suffix = selectedTab ? ' for tab ' + esc(selectedTab) : '';
      container.innerHTML = '<div class="empty">No sections found in AI_Config.md' + suffix + '.</div>';
      return;
    }

    let html = '';
    sections.forEach(sec => {
      const groups = buildGroups(sec);
      groups.forEach(group => {
        if (!groupChoice[group.groupKey] || !group.items.some(i => i.id === groupChoice[group.groupKey])) {
          groupChoice[group.groupKey] = group.selectedId;
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
        html += '<div class="item" data-item-group="' + esc(group.groupKey) + '">';
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
        html += '</div>';
      });
      
      html += '</div></div>';
    });
    
    container.innerHTML = html;
  }

  function renderBadges() {
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
        grouped.set(groupKey, {
          groupKey,
          label: item.label,
          items: [],
          control: item.control || null,
          singleOutput: item.singleOutput || item.label
        });
      }
      const group = grouped.get(groupKey);
      if (!group.control && item.control) group.control = item.control;
      if (!group.singleOutput && item.singleOutput) group.singleOutput = item.singleOutput;
      group.items.push(item);
    });

    return Array.from(grouped.values()).map(group => {
      const control = group.control === 'select' || group.items.length > 1 ? 'select' : 'checkbox';
      const hasSelected = groupChoice[group.groupKey] && group.items.some(i => i.id === groupChoice[group.groupKey]);
      const selectedId = hasSelected ? groupChoice[group.groupKey] : group.items[0].id;
      return {
        ...group,
        control,
        selectedId
      };
    });
  }

  function getGroupOutput(groupKey) {
    for (const sec of sections) {
      const groups = buildGroups(sec);
      const group = groups.find(g => g.groupKey === groupKey);
      if (!group) continue;

      let txt = String(group.singleOutput || group.label || '').trim();
      if (group.control === 'select') {
        const selId = groupChoice[group.groupKey];
        const opt = group.items.find(i => i.id === selId) || group.items[0];
        const value = String(opt.optionValue || opt.description || '').trim();
        if (txt && value) txt += ' ' + value;
        else if (!txt) txt = value;
      }
      return txt;
    }
    return '';
  }

  function normalizeOutput(text) {
    return String(text || '').replace(/\\s+/g, ' ').trim();
  }

  function buildGeneratedOutput() {
    const parts = [];
    const seen = new Set();
    selectedGroups.forEach(groupKey => {
      if (!checked[groupKey] || seen.has(groupKey)) return;
      const txt = getGroupOutput(groupKey);
      if (txt) {
        parts.push(txt);
        seen.add(groupKey);
      }
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

  function clearAll() {
    checked = {};
    selectedGroups = [];
    userSuffix = '';
    document.getElementById('output').value = '';
    render();
  }

  function handleReload() {
    checked = {};
    selectedGroups = [];
    userSuffix = '';
    document.getElementById('output').value = '';
    document.getElementById('panels').innerHTML = '<div class="empty">Loading…</div>';
    vscode.postMessage({ command: 'refresh' });
  }

  function sendToChat() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'sendToChat', text });
  }

  function copyPrompt() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'copyToClipboard', text });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Signal to extension that the webview is ready to receive messages.
  // Using window load here makes the initial request more reliable across reloads.
  window.addEventListener('load', () => {
    vscode.postMessage({ command: 'ready' });
  });
</script>
</body>
</html>`;
  }
}

function activate(context) {
  const channel = vscode.window.createOutputChannel('Prompt Builder');
  channel.appendLine('Prompt Builder: activate() called');
  const ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : '(no workspace)';
  channel.appendLine('Workspace root: ' + ws);
  channel.show(true);
  try {
    vscode.window.showInformationMessage('Prompt Builder extension activated');
  } catch (e) {}

  const provider = new PromptBuilderViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('promptBuilderView', provider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('promptBuilder.openPanel', () => {
      vscode.commands.executeCommand('promptBuilderView.focus');
    })
  );
}

function deactivate() {}
module.exports = { activate, deactivate };
