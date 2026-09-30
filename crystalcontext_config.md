---
id: C:/GIT/topomorph/apps/VSIX_Crystal_Context/crystalcontext_config.md
type: reference
title: crystalcontext_config
name: crystalcontext_config
description: ''
resource: /topomorph/apps/VSIX_Crystal_Context/crystalcontext_config.md
resource_root: C:/GIT
author: brogers
tags: [topomorph, apps, vsix-crystal-context, "configuration-driven-ui", "claude-code", "context-management"]
domain: tools
tokens: 407
generated: {by: 'human:brogers', at: '2026-09-10T14:43:17-04:00'}
okf_version: '0.2'
---
```yaml-table  

Claude Basic:
  mode:
    - label: "Mode"
      options:
        - "/agent"
        - "/code"
        - "/ask"
        - "/plan"
  skills:
    - "/caveman: Full, lite, ultra"
  rules:
    - "(Never use fallbacks let code fail with an error):"
    - "(Never use GIT cmds unless explicitly asked):"
  permissions:
    - label: "/permissions"
      options:
        - "Set-level"
        - "bypassPermissions"
        - "default"
        - "acceptEdits"
        - "dontAsk"
        - "readOnly"
  model: 
    - label: "model"
      options:
        - opus
        - haiku
        - sonnet 4.5
        - sonnet 4.6
  token-memory management: 
    - "/context: Check loaded skills, context size"
    - "/memory: List loaded files"
    - "/clear: Clear history-free context." 
    - "/compact: Compact conversation."
    - "/caveman ultra: Full, lite, ultra"
  slash_commands:
    - "/simplify: Improve the code"
    - "/remote-control: Control session from phone"
    - "/fast: Speed it up"
    - "/debug: Enable debug-read session debug log."
Claude Session:
  Analyze Usage:
    - "/insights: Analyze patterns and friction points."
    - "/stats: Visualize usage, session history, streaks."
    - "/usage: Report on usage"
  Preferences:
    - "/skills: List available skills."
    - "/config: View status, settings, usage, stats."

Notepad:
  Scope:
    - label: "Notepad file"
      control: radio
      options:
        - "Project: <project>/notes.md"
        - "Global: <User>/.claude/notes.md"



```
