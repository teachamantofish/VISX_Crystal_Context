/**
 * Headless integration test — mocks vscode, loads dist/extension.js,
 * drives the full activate → resolveWebviewView → ready → loadItems flow.
 * Run: node test/extension-test.js
 */
const assert = require('assert');
const path = require('path');

// ── Mock vscode ──────────────────────────────────────────────────────────────
let postedMessages = [];
let receivedMessageHandler = null;

const mockWebview = {
  options: {},
  html: '',
  postMessage(msg) { postedMessages.push(msg); return Promise.resolve(); },
  onDidReceiveMessage(fn) { receivedMessageHandler = fn; return { dispose() {} }; },
};

const mockWebviewView = {
  webview: mockWebview,
  visible: true,
  onDidChangeVisibility() { return { dispose() {} }; },
  onDidDispose() { return { dispose() {} }; },
};

let registeredViewProvider = null;

const mockGlobalState = {
  _map: new Map(),
  get(k) {
    return this._map.get(k);
  },
  update(k, v) {
    this._map.set(k, v);
    return Promise.resolve();
  },
};

const mockVscode = {
  window: {
    registerWebviewViewProvider(id, provider) {
      registeredViewProvider = provider;
      return { dispose() {} };
    },
    showInformationMessage() {},
    createOutputChannel() { return { appendLine() {}, show() {} }; },
  },
  commands: {
    registerCommand() { return { dispose() {} }; },
    executeCommand: async () => {},
  },
  workspace: {
    workspaceFolders: null,
    onDidChangeWorkspaceFolders() {
      return { dispose() {} };
    },
    createFileSystemWatcher() {
      return {
        onDidChange() { return { dispose() {} }; },
        onDidCreate() { return { dispose() {} }; },
        onDidDelete() { return { dispose() {} }; },
        dispose() {},
      };
    },
  },
  env: { clipboard: { writeText: async () => {} } },
  RelativePattern: class {
    constructor(_base, _pattern) {
      this.pattern = _pattern;
    }
  },
  Uri: {
    file(fsPath) {
      return { fsPath };
    },
  },
};

// Intercept require('vscode') before loading bundled extension
// (crypto and other builtins pass through normally)
const Module = require('module');
const _orig = Module._load;
Module._load = function(req, parent, isMain) {
  if (req === 'vscode') return mockVscode;
  return _orig.apply(this, arguments);
};
const ext = require('../dist/extension.js');
Module._load = _orig;

// ── Helpers ──────────────────────────────────────────────────────────────────
function pass(msg) { console.log('  PASS:', msg); }
function fail(msg, detail) {
  console.error('  FAIL:', msg);
  if (detail) console.error('        ', detail);
  process.exitCode = 1;
}

// ── Test 1: activate() ───────────────────────────────────────────────────────
console.log('\n[1] activate()');
ext.activate({
  extensionUri: { fsPath: path.resolve(__dirname, '..') },
  subscriptions: [],
  globalState: mockGlobalState,
});
registeredViewProvider !== null
  ? pass('registerWebviewViewProvider called')
  : fail('registerWebviewViewProvider NOT called');

// ── Test 2: resolveWebviewView sets HTML ─────────────────────────────────────
console.log('\n[2] resolveWebviewView()');
registeredViewProvider.resolveWebviewView(mockWebviewView);
mockWebview.html.includes('<!DOCTYPE html>')
  ? pass('HTML written to webview')
  : fail('HTML not set', mockWebview.html.slice(0, 120));
mockWebview.html.includes('acquireVsCodeApi')
  ? pass('acquireVsCodeApi present in HTML')
  : fail('acquireVsCodeApi missing — webview script broken');
mockWebview.html.includes('Content-Security-Policy')
  ? pass('CSP meta tag present')
  : fail('CSP meta tag missing — inline script may be blocked');
(/script.*nonce=/.test(mockWebview.html))
  ? pass('script nonce present')
  : fail('script nonce missing — inline script will be blocked by CSP');
receivedMessageHandler !== null
  ? pass('onDidReceiveMessage registered')
  : fail('onDidReceiveMessage NOT registered');

// ── Test 3: ready → noWorkspace (no workspace folders) ───────────────────────
console.log('\n[3] ready message (no workspace)');
postedMessages = [];
receivedMessageHandler({ command: 'ready' });
const t3nw = postedMessages.find(m => m.command === 'noWorkspace');
const t3nf = postedMessages.find(m => m.command === 'noFile');
const t3li = postedMessages.find(m => m.command === 'loadItems');
if (t3nw || t3nf) {
  pass('posted ' + (t3nw ? 'noWorkspace' : 'noFile') + ' as expected');
} else if (t3li) {
  pass('posted loadItems (workspace has config)');
} else {
  fail('no load/noWorkspace/noFile after ready', JSON.stringify(postedMessages));
}

// ── Test 4: ready → loadItems (workspace has AI_Config.md) ───────────────────
console.log('\n[4] ready message (workspace = project root)');
mockVscode.workspace.workspaceFolders = [{ uri: { fsPath: path.resolve(__dirname, '..') } }];
postedMessages = [];
mockWebview.html = '';
receivedMessageHandler = null;
registeredViewProvider.resolveWebviewView(mockWebviewView);
receivedMessageHandler && receivedMessageHandler({ command: 'ready' });
const t4msg = postedMessages.find(m => m.command === 'loadItems')
  || postedMessages.find(m => m.command === 'parseError')
  || postedMessages.find(m => m.command === 'noFile')
  || postedMessages[postedMessages.length - 1];
if (!t4msg) {
  fail('no message posted');
} else if (t4msg.command === 'parseError') {
  fail('parseError — YAML parsing failed', t4msg.detail);
} else if (t4msg.command === 'loadItems') {
  pass('loadItems received');
  pass('tabs: ' + JSON.stringify(t4msg.tabs));
  pass('sections in first tab: ' + (t4msg.sections || []).map(s => s.title).join(', '));
  if (!Array.isArray(t4msg.tabs) || t4msg.tabs.length === 0) {
    fail('loadItems.tabs must be non-empty when crystalcontext_config.md parses');
  } else {
    pass('loadItems.tabs non-empty');
  }
  if (!Array.isArray(t4msg.sections)) {
    fail('loadItems.sections must be an array');
  } else {
    pass('loadItems.sections is array (len ' + t4msg.sections.length + ')');
  }
} else {
  fail('unexpected command: ' + t4msg.command, JSON.stringify(t4msg));
}

// ── Done ─────────────────────────────────────────────────────────────────────
console.log('');
if (!process.exitCode) {
  console.log('All tests passed — extension loads and drives correctly.');
} else {
  console.log('Some tests FAILED — see above.');
}
