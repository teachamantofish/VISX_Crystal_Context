/**
 * Headless integration test for the bundled extension:
 * mocks the VS Code host, drives the webview message loop, and verifies the
 * config/terminal/editor actions exposed by the Crystal Context sidebar.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

let postedMessages = [];
let receivedMessageHandler = null;
let registeredViewProvider = null;
let createdTerminals = [];
let openedDocuments = [];
let shownDocuments = [];
let infoMessages = [];
let errorMessages = [];

// Build a terminal mock that records show/sendText calls.
function makeMockTerminal(name) {
  return {
    name,
    shown: false,
    sentText: [],
    show() { this.shown = true; },
    sendText(text, shouldExecute) { this.sentText.push({ text, shouldExecute }); },
  };
}

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

const mockGlobalState = {
  _map: new Map(),
  get(key) {
    return this._map.get(key);
  },
  update(key, value) {
    this._map.set(key, value);
    return Promise.resolve();
  },
};

const mockVscode = {
  window: {
    registerWebviewViewProvider(_id, provider) {
      registeredViewProvider = provider;
      return { dispose() {} };
    },
    showInformationMessage(message) {
      infoMessages.push(message);
    },
    showErrorMessage(message) {
      errorMessages.push(message);
    },
    showTextDocument(document, options) {
      shownDocuments.push({ document, options });
      return Promise.resolve();
    },
    createOutputChannel() { return { appendLine() {}, show() {} }; },
    activeTerminal: undefined,
    createTerminal(name) {
      const terminal = makeMockTerminal(name);
      createdTerminals.push(terminal);
      return terminal;
    },
  },
  commands: {
    registerCommand() { return { dispose() {} }; },
    executeCommand: async () => {},
  },
  workspace: {
    workspaceFolders: null,
    openTextDocument(targetPath) {
      openedDocuments.push(targetPath);
      return Promise.resolve({ uri: { fsPath: targetPath } });
    },
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
    constructor(_base, pattern) {
      this.pattern = pattern;
    }
  },
  Uri: {
    file(fsPath) {
      return { fsPath };
    },
  },
};

// Print a passing assertion in the existing test style.
function pass(message) {
  console.log('  PASS:', message);
}

// Print a failing assertion and mark the process as failed.
function fail(message, detail) {
  console.error('  FAIL:', message);
  if (detail) console.error('        ', detail);
  process.exitCode = 1;
}

// Reset the side-effect arrays between tests.
function resetHostSpies() {
  createdTerminals = [];
  openedDocuments = [];
  shownDocuments = [];
  infoMessages = [];
  errorMessages = [];
}

// Load the bundled extension with the vscode module mocked.
function loadExtension() {
  const Module = require('module');
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'vscode') return mockVscode;
    return originalLoad.apply(this, arguments);
  };
  const extension = require('../dist/extension.js');
  Module._load = originalLoad;
  return extension;
}

// Run the extension end-to-end against the current host mocks.
async function main() {
  const extension = loadExtension();

  console.log('\n[1] activate()');
  extension.activate({
    extensionUri: { fsPath: path.resolve(__dirname, '..') },
    subscriptions: [],
    globalState: mockGlobalState,
  });
  registeredViewProvider !== null
    ? pass('registerWebviewViewProvider called')
    : fail('registerWebviewViewProvider NOT called');

  console.log('\n[2] resolveWebviewView()');
  registeredViewProvider.resolveWebviewView(mockWebviewView);
  mockWebview.html.includes('<!DOCTYPE html>')
    ? pass('HTML written to webview')
    : fail('HTML not set', mockWebview.html.slice(0, 120));
  mockWebview.html.includes('acquireVsCodeApi')
    ? pass('acquireVsCodeApi present in HTML')
    : fail('acquireVsCodeApi missing - webview script broken');
  mockWebview.html.includes('Content-Security-Policy')
    ? pass('CSP meta tag present')
    : fail('CSP meta tag missing - inline script may be blocked');
  /script.*nonce=/.test(mockWebview.html)
    ? pass('script nonce present')
    : fail('script nonce missing - inline script will be blocked by CSP');
  receivedMessageHandler !== null
    ? pass('onDidReceiveMessage registered')
    : fail('onDidReceiveMessage NOT registered');

  console.log('\n[3] ready message (no workspace)');
  postedMessages = [];
  await receivedMessageHandler({ command: 'ready' });
  const noWorkspaceMessage = postedMessages.find(message => message.command === 'noWorkspace');
  const noFileMessage = postedMessages.find(message => message.command === 'noFile');
  const loadItemsMessage = postedMessages.find(message => message.command === 'loadItems');
  if (noWorkspaceMessage || noFileMessage) {
    pass('posted ' + (noWorkspaceMessage ? 'noWorkspace' : 'noFile') + ' as expected');
  } else if (loadItemsMessage) {
    pass('posted loadItems (workspace has config)');
  } else {
    fail('no load/noWorkspace/noFile after ready', JSON.stringify(postedMessages));
  }

  console.log('\n[4] ready message (workspace = project root)');
  mockVscode.workspace.workspaceFolders = [{ uri: { fsPath: path.resolve(__dirname, '..') } }];
  postedMessages = [];
  mockWebview.html = '';
  receivedMessageHandler = null;
  registeredViewProvider.resolveWebviewView(mockWebviewView);
  if (receivedMessageHandler) await receivedMessageHandler({ command: 'ready' });
  const configLoadMessage = postedMessages.find(message => message.command === 'loadItems')
    || postedMessages.find(message => message.command === 'parseError')
    || postedMessages.find(message => message.command === 'noFile')
    || postedMessages[postedMessages.length - 1];
  if (!configLoadMessage) {
    fail('no message posted');
  } else if (configLoadMessage.command === 'parseError') {
    fail('parseError - YAML parsing failed', configLoadMessage.detail);
  } else if (configLoadMessage.command === 'loadItems') {
    pass('loadItems received');
    pass('tabs: ' + JSON.stringify(configLoadMessage.tabs));
    pass('sections in first tab: ' + (configLoadMessage.sections || []).map(section => section.title).join(', '));
    if (!Array.isArray(configLoadMessage.tabs) || configLoadMessage.tabs.length === 0) {
      fail('loadItems.tabs must be non-empty when crystalcontext_config.md parses');
    } else {
      pass('loadItems.tabs non-empty');
    }
    if (!Array.isArray(configLoadMessage.sections)) {
      fail('loadItems.sections must be an array');
    } else {
      pass('loadItems.sections is array (len ' + configLoadMessage.sections.length + ')');
    }
  } else {
    fail('unexpected command: ' + configLoadMessage.command, JSON.stringify(configLoadMessage));
  }

  console.log('\n[5] webview control wiring');
  mockWebview.html.includes('btnSendTerminal')
    ? pass('Send to Terminal button present in HTML')
    : fail('btnSendTerminal missing from webview HTML');
  mockWebview.html.includes('btnCreateLocal')
    ? pass('Create local button present in HTML')
    : fail('btnCreateLocal missing from webview HTML');
  mockWebview.html.includes('btnEditConfig')
    ? pass('Edit button present in HTML')
    : fail('btnEditConfig missing from webview HTML');
  mockWebview.html.includes('> Workspace</span>')
    ? pass('Workspace scope label present in HTML')
    : fail('Workspace scope label missing from webview HTML');
  mockWebview.html.includes("command: 'sendToTerminal'")
    ? pass('webview script posts sendToTerminal')
    : fail('sendToTerminal postMessage missing from webview script');
  mockWebview.html.includes("command: 'createLocalConfig'")
    ? pass('webview script posts createLocalConfig')
    : fail('createLocalConfig postMessage missing from webview script');
  mockWebview.html.includes("command: 'editConfig'")
    ? pass('webview script posts editConfig')
    : fail('editConfig postMessage missing from webview script');

  console.log('\n[6] sendToTerminal');
  resetHostSpies();
  mockVscode.window.activeTerminal = undefined;
  await receivedMessageHandler({ command: 'sendToTerminal', text: 'hello prompt' });
  if (createdTerminals.length === 1) {
    pass('createTerminal called when no active terminal');
    const terminal = createdTerminals[0];
    terminal.name === 'Crystal Context'
      ? pass('terminal named "Crystal Context"')
      : fail('unexpected terminal name: ' + terminal.name);
    terminal.shown
      ? pass('terminal.show() called')
      : fail('terminal.show() NOT called');
    if (terminal.sentText.length === 1 && terminal.sentText[0].text === 'hello prompt') {
      pass('sendText received the prompt text');
    } else {
      fail('sendText not called with prompt', JSON.stringify(terminal.sentText));
    }
    terminal.sentText[0] && terminal.sentText[0].shouldExecute === false
      ? pass('sendText does not auto-execute (shouldExecute=false)')
      : fail('sendText must pass shouldExecute=false so the user confirms with Enter');
  } else {
    fail('expected exactly 1 created terminal, got ' + createdTerminals.length);
  }

  resetHostSpies();
  const activeTerminal = makeMockTerminal('user-shell');
  mockVscode.window.activeTerminal = activeTerminal;
  await receivedMessageHandler({ command: 'sendToTerminal', text: 'second prompt' });
  createdTerminals.length === 0
    ? pass('no new terminal created')
    : fail('should reuse active terminal, but createTerminal was called');
  if (activeTerminal.sentText.length === 1 && activeTerminal.sentText[0].text === 'second prompt') {
    pass('active terminal received the prompt text');
  } else {
    fail('active terminal did not receive text', JSON.stringify(activeTerminal.sentText));
  }
  activeTerminal.shown
    ? pass('active terminal brought into view')
    : fail('terminal.show() NOT called on active terminal');
  mockVscode.window.activeTerminal = undefined;

  console.log('\n[7] createLocalConfig + editConfig');
  resetHostSpies();
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-home-'));
  const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-workspace-'));
  process.env.USERPROFILE = tmpHome;
  process.env.HOME = tmpHome;
  const globalDir = path.join(tmpHome, '.claude');
  const globalConfigPath = path.join(globalDir, 'crystalcontext_config.md');
  const localConfigPath = path.join(tmpWorkspace, 'crystalcontext_config.md');
  fs.mkdirSync(globalDir, { recursive: true });
  fs.writeFileSync(globalConfigPath, 'alpha:\n  one:\n    - label: test\n', 'utf8');
  mockVscode.workspace.workspaceFolders = [{ uri: { fsPath: tmpWorkspace } }];
  await receivedMessageHandler({ command: 'createLocalConfig' });
  try {
    assert.strictEqual(fs.readFileSync(localConfigPath, 'utf8'), fs.readFileSync(globalConfigPath, 'utf8'));
    pass('createLocalConfig copied global config into workspace root');
    assert(infoMessages.some(message => message.includes('Created workspace config')));
    pass('createLocalConfig reported success');

    await receivedMessageHandler({ command: 'editConfig' });
    assert.deepStrictEqual(openedDocuments, [localConfigPath]);
    pass('editConfig opened the current workspace config');
    assert.strictEqual(shownDocuments.length, 1);
    pass('editConfig showed the config in the editor');
  } catch (err) {
    fail('createLocalConfig/editConfig failed', err && err.stack ? err.stack : String(err));
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(tmpWorkspace, { recursive: true, force: true });
  }

  console.log('');
  if (!process.exitCode) {
    console.log('All tests passed - extension loads and drives correctly.');
  } else {
    console.log('Some tests FAILED - see above.');
  }
}

main().catch(err => {
  fail('unhandled test error', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
