
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

ChatGPT:
  skills:
    - "Not explored..."



```
