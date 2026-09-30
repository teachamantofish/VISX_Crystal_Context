---
id: C:/GIT/topomorph/apps/VSIX_Crystal_Context/memory_procedural.md
type: memory
title: Vsix Crystal Context Procedural Memory
name: memory_procedural
description: Procedural memory applicable to skills, hooks, and other harness components.
resource: /topomorph/apps/VSIX_Crystal_Context/memory_procedural.md
resource_root: C:/GIT
author: brogers
tags: [topomorph, apps, vsix-crystal-context, "vscode", "webview-debugging", "input-validation"]
domain: tools
tokens: 225
generated: {by: 'human:brogers', at: '2026-09-20T13:18:13-04:00'}
okf_version: '0.2'
memory: procedural
---
# Procedural Memory

## 1. A missing or flashing activity-bar icon is stuck VS Code view state
A webview-view extension's icon can be entirely absent from the activity bar (not even listed unchecked in the right-click menu), or flash then vanish after "Developer: Reload Window", even after a full VSIX uninstall/reinstall. Cause: VS Code persists per-workspace view-layout state (`isHidden`/`visible`, keyed by view/container id) in `state.vscdb`, independent of the extension install. Fix: Command Palette → **View: Reset View Locations**. Try this before chasing manifest bugs, AV/EDR interference, or extension-host activation errors. Belongs in the `vsix-webview-debugging` skill's Gotchas.

## 2. AskUserQuestion requires at least 2 options per question
A single-option question is rejected by input validation (`too_small`), wasting a turn — and the error says not to retry with a filler option. Check the option count before calling; if there's only one real path, ask in plain text instead.
