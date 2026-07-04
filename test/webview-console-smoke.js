/**
 * Loads the webview HTML + script in jsdom, stubs acquireVsCodeApi, and fails on
 * console.error (typical webview runtime issues).
 */
const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

function loadWebviewHtml() {
  const src = fs.readFileSync('extension.js', 'utf8').replace(/\r\n/g, '\n');
  const start = src.indexOf('return `<!DOCTYPE html>');
  const end = src.indexOf('`;\n  }\n}', start);
  if (start === -1 || end === -1) {
    throw new Error('Could not locate webview HTML template in extension.js');
  }
  const raw = src.slice(start + 'return '.length, end + 1);
  if (raw[0] !== '`' || raw[raw.length - 1] !== '`') {
    throw new Error('Expected webview template literal delimiters');
  }
  const inner = raw.slice(1, -1);
  return inner.replace(/\$\{nonce\}/g, '__TEST_NONCE__');
}

const html = loadWebviewHtml();
const errors = [];

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.acquireVsCodeApi = () => ({
      postMessage() {},
    });
    const ce = window.console.error.bind(window.console);
    window.console.error = (...args) => {
      errors.push(args);
      ce(...args);
    };
  },
});

function finish() {
  if (errors.length) {
    console.error('console.error calls:', errors);
    assert.fail(`webview script triggered ${errors.length} console.error call(s)`);
  }
  const doc = dom.window.document;
  assert(doc.getElementById('panels'), '#panels exists');
  assert(doc.getElementById('output'), '#output exists');
  assert(doc.getElementById('tabsBar'), '#tabsBar exists');
  assert(!doc.querySelector('.main-tab-bar'), 'duplicate Prompt/Notepad bar removed');
  assert(!doc.getElementById('viewBuilder'), 'legacy viewBuilder removed');
  assert(!doc.getElementById('viewNotepad'), 'legacy viewNotepad removed');
  console.log('webview console smoke passed');
}

// Script runs during parse; load may schedule ready. Settle then assert.
setTimeout(() => {
  try {
    finish();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}, 200);
