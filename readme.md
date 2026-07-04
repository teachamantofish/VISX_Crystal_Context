# Crystal Context VSIX extension — Dev Guide

A customizable Cursor and VSC extension for personal use. 

## Local Development Setup

```bash
cd ~/<dev-directory>
# copy both files in, then:
npm install --save-dev @vscode/vsce
```

## Launch Extension Development Host

Menu: **Run → Start Debugging**
Or Command Palette: `Ctrl+Shift+P` → `Debug: Start Debugging` (same as F5)
Or: **Run → Start Without Debugging**

In the new Extension Development Host (EDH) window:

1. Open Command Palette: `Ctrl+Shift+P`
2. Run: `Crystal Context: Open Panel` (command: `promptBuilder.openPanel`)
3. If not visible, type `Crystal Context` — should appear from `package.json` contributions

**If EDH window appears empty:**

- EDH opens with clean workspace; view may be in Activity Bar
- Show Activity Bar: **View → Appearance → Show Activity Bar**
- Click Crystal Context icon in Activity Bar

**If panel still doesn't appear:**

- EDH → **Help → Toggle Developer Tools** → check console for activation errors
- EDH Command Palette → `Developer: Show Running Extensions` → verify `crystal-context` loaded
- If `CLAUDE.md` required: **File → Open Folder** in EDH → select workspace containing `CLAUDE.md`

## Iterate Without Packaging

Open folder in VS Code → press `F5` → launches EDH with extension loaded live.
Edit `extension.js` → `Ctrl+Shift+F5` to restart → iterate.

**Two things still to resolve:**

- `CLAUDE.md` path — check what `workspaceFolders[0].uri.fsPath` resolves to vs. actual file location
- Claude Code chat command ID — search command palette for `claude` to find correct send target

---

## Persistence

### Persistent Session Injection — Full Build

**How it works:** `UserPromptSubmit` hook fires before every message. Hook reads `/tmp/claude_session_persist.txt` → stdout injected as `<system-reminder>` every turn.

### Step 1 — Edit `~/.claude/settings.json`

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/bin/bash -c '[ -f /tmp/claude_session_persist.txt ] && cat /tmp/claude_session_persist.txt || true'"
          }
        ]
      }
    ]
  }
}
```

> If `settings.json` already has content, merge `hooks` key into existing JSON.

### Step 2 — Create Preset File

```
~/.claude/persist-presets/caveman.txt
```

Contents: paste caveman ultra rules verbatim (the "Respond terse like smart caveman..." block).

### Step 3 — Shell Scripts

**Activate persistence** (`~/.local/bin/claude-persist`):

```bash
#!/bin/bash
PRESET="${1:-caveman}"
PRESET_FILE="$HOME/.claude/persist-presets/$PRESET.txt"
if [ ! -f "$PRESET_FILE" ]; then
  echo "No preset: $PRESET_FILE"
  exit 1
fi
cp "$PRESET_FILE" /tmp/claude_session_persist.txt
echo "Persisting $PRESET for this session."
```

**Clear persistence** (`~/.local/bin/claude-persist-clear`):

```bash
#!/bin/bash
rm -f /tmp/claude_session_persist.txt
echo "Cleared."
```

**Make executable:**

```bash
chmod +x ~/.local/bin/claude-persist
chmod +x ~/.local/bin/claude-persist-clear
```

### Step 4 — Usage

Before starting Claude session:

```bash
claude-persist caveman
```

To stop:

```bash
claude-persist-clear
```

### Why Hook Injection Works

| Method | Fails because |
|--------|---------------|
| `CLAUDE.md` rule | Read once at session start → drift |
| `/caveman` skill | Loads rules once → no re-enforcement |
| Hook injection | Fires EVERY message → rules every turn → can't drift |

### Optional: Auto-Clear on Session End

Add to `.bashrc`:

```bash
alias claude='claude-persist caveman && command claude; claude-persist-clear'
```

Auto-activates caveman, clears when session exits.

### Caveats

- `/tmp/` cleared on reboot — intentional (session-scoped)
- Multiple concurrent Claude sessions share same file — use `/tmp/claude_persist_$$` + PID if needed (complex, skip unless required)
- Hook stdout limit unknown — keep preset files under ~2KB
