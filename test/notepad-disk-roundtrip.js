/**
 * Mirrors saveNotepad host behavior: mkdir + writeFileSync to crystalcontext_notepad.txt path.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const NOTEPAD_FILE = 'crystalcontext_notepad.txt';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-notepad-'));
const p = path.join(dir, NOTEPAD_FILE);
const payload = `roundtrip-${Date.now()}\n`;

fs.mkdirSync(path.dirname(p), { recursive: true });
fs.writeFileSync(p, payload, 'utf8');
assert.strictEqual(fs.readFileSync(p, 'utf8'), payload);
fs.unlinkSync(p);
fs.rmdirSync(dir);

console.log('notepad disk roundtrip ok');
