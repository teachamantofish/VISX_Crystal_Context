const assert = require('assert');
const fs = require('fs');

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
  // Avoid evaluating the extension template (would need `nonce` in scope for ${nonce})
  return inner.replace(/\$\{nonce\}/g, '__TEST_NONCE__');
}

function normalizeOutput(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function parseUserSuffix(rawOutput, generated) {
  const raw = normalizeOutput(rawOutput);
  if (!generated) return raw;
  if (raw === generated) return '';
  if (raw.startsWith(generated + ' ')) {
    return normalizeOutput(raw.slice(generated.length));
  }
  return raw;
}

function buildGeneratedOutput(selectedGroups, checked, outputs) {
  const parts = [];
  const seen = new Set();
  selectedGroups.forEach(groupKey => {
    if (!checked[groupKey] || seen.has(groupKey)) return;
    const txt = outputs[groupKey] || '';
    if (txt) {
      parts.push(txt);
      seen.add(groupKey);
    }
  });
  return parts.join(' ');
}

function buildFinalOutput(selectedGroups, checked, outputs, userSuffix) {
  const parts = [];
  const generated = buildGeneratedOutput(selectedGroups, checked, outputs);
  if (generated) parts.push(generated);
  if (userSuffix) parts.push(userSuffix);
  return normalizeOutput(parts.join(' '));
}

const html = loadWebviewHtml();
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
assert(scriptMatch, 'webview script should exist');
const script = scriptMatch[1];

new Function(script);

assert(!html.includes('readonly></textarea>'), 'prompt textarea should remain editable');
assert(
  script.includes("replace(/\\\\s+/g, ' ').trim()") || script.includes("replace(/\\s+/g, ' ').trim()"),
  'normalizeOutput should collapse whitespace, not strip letters'
);

const outputs = {
  never: '(Never use GIT cmds unless explicitly asked)',
  caveman: '/caveman',
  model: '/model haiku',
  remote: '/remote-control'
};

let selectedGroups = [];
let checked = {};

checked.never = true;
selectedGroups.push('never');
assert.strictEqual(
  buildFinalOutput(selectedGroups, checked, outputs, ''),
  '(Never use GIT cmds unless explicitly asked)'
);

checked.caveman = true;
selectedGroups.push('caveman');
assert.strictEqual(
  buildFinalOutput(selectedGroups, checked, outputs, ''),
  '(Never use GIT cmds unless explicitly asked) /caveman'
);

checked.model = true;
selectedGroups.push('model');
const generated = buildGeneratedOutput(selectedGroups, checked, outputs);
assert.strictEqual(
  generated,
  '(Never use GIT cmds unless explicitly asked) /caveman /model haiku'
);

const suffix = parseUserSuffix(
  '(Never use GIT cmds unless explicitly asked) /caveman /model haiku sonnet',
  generated
);
assert.strictEqual(suffix, 'sonnet');
assert.strictEqual(
  buildFinalOutput(selectedGroups, checked, outputs, suffix),
  '(Never use GIT cmds unless explicitly asked) /caveman /model haiku sonnet'
);

checked.remote = true;
selectedGroups.push('remote');
assert.strictEqual(
  buildFinalOutput(selectedGroups, checked, outputs, suffix),
  '(Never use GIT cmds unless explicitly asked) /caveman /model haiku /remote-control sonnet'
);

selectedGroups.push('never');
assert.strictEqual(
  buildGeneratedOutput(selectedGroups, checked, outputs),
  '(Never use GIT cmds unless explicitly asked) /caveman /model haiku /remote-control'
);

console.log('webview regression checks passed');
