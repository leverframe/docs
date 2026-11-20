---
title: Observers
description: Codex observer — JSONL parsing and process wrapper
sidebar_position: 8
---

<!-- sources: src/observers/codex.ts, src/daemon/cli.ts -->

# Observers (`src/observers/`)

Observers translate an agent's native event stream into normalized
`AgentEvent`s. Currently there is one: the Codex observer. Claude Code events
are produced directly by `runClaudeStream` in the
[daemon](./daemon.md#claude-code-stream) instead of a separate observer class.

## Codex observer

Source: `src/observers/codex.ts`. Two halves: a pure JSONL parser and a thin
spawn wrapper.

### Spawn wrapper (`CodexObserver`)

`run(prompt, opts)` spawns `codex exec --json <prompt>` (binary path from
`opts.codexPath`, else the `CODEX_PATH` environment variable, else `codex`).
On Windows it spawns with `shell: true` so npm's `.cmd` shim resolves. Stderr
chunks are forwarded to `opts.onStderr`; parsed events go to `opts.onEvent`.

- The promise resolves on a zero exit code.
- A spawn failure rejects with `failed to spawn codex ("<path>"): ...`; a
  non-zero exit (including Windows shell code 9009 for a missing binary)
  rejects with `codex ("<path>") exited with code <n>`. In wrapper mode this
  surfaces as a supervision error and exit code `1`.
- `stop()` kills the running codex process — this is the kill path invoked
  when a guardrail denies (exit code `2`).

Session attribution: lines carrying a session/thread id (`thread.started` in
the modern stream, `session_configured` in the legacy stream) are captured via
`codexSessionId` and attached to subsequent session-less events.

### Wire formats

The parser (`parseCodexEvent`) handles two formats; unrecognized lines yield
null:

**1. Modern ThreadEvent stream** (`codex exec --json`):

- `item.started` / `item.completed` with `item.type`:
  - `command_execution` -> tool `shell` (input `{command, itemId}`; on
    completion, output `{exit_code, output, status}` from `aggregated_output`)
  - `file_change` -> tool `edit` (input `{changes, itemId}`)
  - `mcp_tool_call` -> tool `mcp:<server>.<tool>` (input `{arguments, itemId}`)
  - `web_search` -> tool `web_search` (input `{query, action, itemId}`)
- `turn.*`, `thread.started`, `agent_message`, `reasoning`, errors — no event.

**2. Legacy EventMsg stream** (`{"id":"<conv>","msg":{...}}`):

- `exec_command_begin` / `exec_command_end` -> tool `shell` (input
  `{command, cwd, callId}`; on `end`, output includes `exit_code`,
  `aggregated_output`, `status`, `duration`)
- `patch_apply_begin` / `patch_apply_end` -> tool `edit` (input
  `{changes, callId}`; on `end`, output `{success, stdout, stderr, status}`)
- `session_configured`, `agent_message`, `token_count`, etc. — no event.

Note the tool-name mapping and its downstream effects: codex shell work
arrives as `shell`, which the loop-breaker treats as a shell tool — so its
no-progress and failure-signature detectors get the output they need. Codex
file changes arrive as lowercase `edit`, which is in neither the scope-guard's
`FILE_TOOLS` set nor the ast-gate's `GATED_TOOLS` set — codex file writes are
therefore not path-checked or AST-gated in v0.1.1.
