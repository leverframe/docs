---
title: Getting started
description: Install wranglebot and run your first supervised session
sidebar_position: 2
---

<!-- sources: package.json, bin/wranglebot.mjs, src/daemon/cli.ts, src/daemon/registry.ts, README.md -->

# Getting started

## Install

```bash
npm install -g @wranglebot/cli
```

Requires Node.js 20 or newer (`engines` field in `package.json`). Two binaries
are installed:

- `wranglebot` — the supervisor CLI (`bin/wranglebot.mjs`).
- `wranglebot-hook` — the Claude Code PreToolUse hook entry point
  (`bin/wranglebot-hook.mjs`). See [Hooks](./hooks.md).

## The run command

```bash
wranglebot run <claude-code|codex> [PROMPT...] [--workdir DIR] [--scope PATH]...
```

That is the entire CLI surface (arg parsing lives in `parseArgs` in
`src/daemon/cli.ts`):

- The only subcommand is `run`. Anything else is rejected with exit `1`.
- The agent is positional and must be exactly `claude-code` or `codex`.
- The prompt is every positional argument joined with single spaces.
- `--workdir DIR` — project root handed to the guardrails; defaults to the
  current working directory. Also the `cwd` for the spawned agent and the
  flush directory for `.curt` output.
- `--scope PATH` — repeatable. Each value is handed to `scope-guard` as an
  additional allowed write root outside the workdir
  (`allowedPaths` in `src/daemon/registry.ts`).
- Any other `--flag` is an unknown-flag error (exit `1`).

Semantics:

- **workdir**: the containment root. `scope-guard` denies file writes that
  resolve outside it (unless covered by a `--scope` root), and `ast-gate`
  uses it for destructive-deletion path checks.
- **scope**: escape hatches for directories the agent may legitimately write
  outside the workdir (e.g. a sibling checkout). An exact `--scope` entry also
  overrides the default denied patterns (`.git/`, `.github/workflows/`,
  `.claude/settings.json`).

## Worked example

```bash
wranglebot run claude-code "fix the failing tests" \
  --workdir /path/to/repo \
  --scope ../shared-lib
```

What happens:

1. `parseArgs` validates the command, agent, and flags. On failure it prints
   `wranglebot: <error>` plus the usage line to stderr and exits `1`.
2. A session id (UUID) is generated and the guardrails load
   (`loadGuardrails` in `src/daemon/registry.ts`, order: `ast-gate`,
   `loop-breaker`, `scope-guard`). stderr:
   `wranglebot session <uuid> agent=claude-code guardrails=[ast-gate, loop-breaker, scope-guard]`
3. The Claude Code CLI is spawned as
   `claude -p "fix the failing tests" --output-format stream-json --verbose`
   with `cwd` set to the workdir (`src/daemon/claude-stream.ts`).
4. Every `tool_use` block in the stream-json becomes an `AgentEvent` and runs
   through the guardrails. Each verdict is printed to stderr:
   `wranglebot: Edit -> deny (scope-guard: ... is outside workdir ...)`
5. On the first `deny` verdict the agent process is killed. On a clean finish
   the agent's own exit code is returned.
6. Before exiting, all buffered records are flushed to
   `/path/to/repo/.wranglebot/<session>.curt` and stderr prints
   `wranglebot: curt written: <file>`.

## Codex

```bash
wranglebot run codex "refactor the parser" --workdir /path/to/repo
```

Same pipeline; the agent is spawned as `codex exec --json <prompt>` (override
the binary path with the `CODEX_PATH` environment variable) and its JSONL
events are parsed by the [Codex observer](./observers.md).

## Hook mode (no wrapper process)

Instead of wrapping the whole run, you can attach wranglebot as a native
Claude Code PreToolUse hook so edit-tool calls are gated inline:

```json
{
  "hooks": {
    "PreToolUse": [{ "hooks": [{ "type": "command", "command": "wranglebot-hook" }] }]
  }
}
```

See [Hooks](./hooks.md).

## Related

- [Guardrails](./guardrails.md) — what each guardrail checks.
- [Exit codes](./reference/exit-codes.md) — full code reference.
