---
id: /doctools/VSIX_Crystal_Context/release_notes.md
type: changelist
title: VSIX_Crystal_Context change list
name: VSIX_Crystal_Context-change-list
description: ''
resource: /doctools/VSIX_Crystal_Context/release_notes.md
author: brogers
tags: [topomorph, apps, vsix-crystal-context]
domain: tools
tokens: 245
generated: {by: 'human:brogers', at: '2026-09-10T14:43:17-04:00'}
okf_version: '0.2'
---
# Release Notes

## 10-04
- OKF frontmatter: 1 file(s): over-long auto-filled descriptions shortened to one sentence (schema `maxLength: 400`), keywords moved into `tags`.
- OKF frontmatter normalized by `okf_update.py --write` (9 Markdown files): types moved to the new OKF enum (`reference` -> `documentation`, release notes -> `changelist`, `.claude/agent.md` -> `rules`, memory files -> `memory`), missing `id`/`name`/`domain`/`tokens`/`generated` filled, blank agent-only keys dropped. Bodies unchanged.

## 10-03
- `AGENTS.md`: `## Memory` now names the `memory_router.py lookup <file>` fallback for when no hook delivers memory, and the index table sits between `<!-- memory-index:start -->` / `<!-- memory-index:end -->` markers for future generation from memory-file front-matter.
- Memory inbox sorted: the activity-bar view-state lesson moved to the vsix-webview-debugging skill (vsix-01); `memory_archive.md` records it.

## Changes

## Future
