---
slug: /
title: Introduction
description: What wranglebot is and why it exists
sidebar_position: 1
---

<!-- sources: README.md, package.json, LICENSE, src/types.ts, src/daemon/cli.ts -->

# WrangleBot

WrangleBot is a deterministic supervisor for coding agents (Claude Code, Codex).
It sits between your agent and its tools and makes thrashing expensive:
dangerous constructs get gated before they execute, runaway loops get killed by
deterministic signals, and every decision lands in a `.curt` record.

The package is `@wranglebot/cli` (npm), a TypeScript CLI requiring Node.js 20+.
Licensed under BUSL-1.1 — free for personal and noncommercial use, converts
to MIT on 2030-10-16, commercial use requires a written license from the
licensor. It is not MIT-licensed today.

## The three pillars

1. **Guardrails** — pre-execution inspection of every tool call the agent
   attempts. The `ast-gate` parses the content of file edits with tree-sitter
   and denies dangerous constructs; the `scope-guard` confines file writes to
   the session workdir; the `loop-breaker` counts repeated calls and failures.
2. **Loop-breaking** — deterministic kill signals. When the agent repeats the
   identical call too many times, or keeps producing the same failure, it is
   killed instead of allowed to burn more tokens.
3. **`.curt` records** — every supervised event and its verdict is serialized
   to a `.curt` file under `.wranglebot/` in the workdir when the session ends.
   WrangleBot is the first consumer of the
   [.curt format](https://curtisai.tech/curt).

## The exit-code contract

| Code | Meaning |
| ---- | ------- |
| `0` | Agent finished clean; no deny verdict was issued. |
| `1` | Setup or supervision error: bad CLI arguments, missing prompt, agent failed to spawn or exited non-zero. |
| `2` | The agent was denied — killed by a loop-breaker signal or blocked by a guardrail deny. |

Details and the full failure taxonomy: [Exit codes](./reference/exit-codes.md).

## Supervisors supervise

WrangleBot does not run your agent better — it watches. Tool calls flow through
a supervision pipeline (`src/daemon/`), each guardrail returns a verdict
(`allow`, `warn`, `deny`, `rewrite`; see `src/types.ts`), and the first deny or
rewrite wins. A deny in wrapper mode kills the agent process immediately and
the run exits `2`. There is no LLM in the loop: every decision is derived
mechanically from the event stream.

## Where to go next

- [Getting started](./getting-started.md) — install and run your first
  supervised session.
- [Guardrails](./guardrails.md) — the complete guardrail reference.
- [CLI reference](./reference/cli.md) — every flag and subcommand.
