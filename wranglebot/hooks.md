---
title: Hooks
description: Claude Code PreToolUse hook mode — wranglebot-hook
sidebar_position: 7
---

<!-- sources: src/hooks/cc-hook.ts, src/hooks/ast-gate.ts, src/hooks/index.ts, bin/wranglebot-hook.mjs, README.md -->

# Hooks

Hook mode runs WrangleBot as a native Claude Code PreToolUse hook instead of a
wrapper process. Instead of supervising the whole run, the hook evaluates each
edit-tool call the moment Claude Code proposes it.

## Setup

The `wranglebot-hook` binary (`bin/wranglebot-hook.mjs`) is registered as a
command hook:

```json
{
  "hooks": {
    "PreToolUse": [{ "hooks": [{ "type": "command", "command": "wranglebot-hook" }] }]
  }
}
```

## What the hook intercepts

`src/hooks/cc-hook.ts` reads the full hook input JSON from stdin (fields used:
`session_id`, `hook_event_name`, `tool_name`, `tool_input`, `cwd`) and:

- Returns allow if `hook_event_name` is not `PreToolUse` or `tool_name` is
  missing — non-edit events are not the hook's business.
- Returns allow for tools outside the gated set `Edit`, `Write`, `MultiEdit`.
- Otherwise constructs an `AgentEvent` and runs it through the
  [ast-gate](./guardrails.md#ast-gate) only, with `workdir` taken from the
  hook's `cwd` field. The other guardrails do not participate in hook mode.

## Decision mapping

Verdicts map onto the Claude Code hook contract
(`hookSpecificOutput.permissionDecision`):

| ast-gate verdict | Hook output | Effect in Claude Code |
| ---------------- | ----------- | --------------------- |
| `allow` (or nothing to gate) | `permissionDecision: "allow"` with reason | Tool runs |
| `warn` | `permissionDecision: "ask"` with reason | Approval prompt shown to the user |
| `deny` | `permissionDecision: "deny"` with reason | Tool blocked |
| `rewrite` | `permissionDecision: "allow"` plus `updatedInput` | Tool runs with the replaced arguments |

Fail-open is enforced in the hook path: if `gate.inspect` throws, the hook
returns allow with an internal-error reason rather than blocking the edit.

## Ordering

There is a single guardrail in hook mode, so no guardrail ordering applies.
Within Claude Code itself, PreToolUse hooks run before the tool executes; the
hook's stdout JSON is the decision.

## Exit codes

Per the Claude Code hook contract (verified against the hooks docs, see the
header comment in `cc-hook.ts`):

- `0` — success; the stdout decision fields apply.
- `2` — blocking error: used when stdin cannot be read or the hook input is
  not valid JSON. Stderr carries the reason.
- Any other code — non-blocking error.

## Programmatic use

`src/hooks/index.ts` exports `handleHookInput(json)` (pure: parsed input JSON
to output JSON string) and `main()` (stdin/stdout CLI entry), so the hook
behavior can be exercised without spawning a subprocess.
