---
title: start_session
description: Generate a session key for multi-turn conversations with a fleet agent
sidebar_position: 7
---

<!-- sources: index.ts -->

# start_session

Generate a fresh `session_key` for multi-turn conversation with a fleet
agent. Pass the returned key as `session_key` to subsequent `invoke_agent`
calls to preserve context. Conversation state is persisted server-side by the
agent gateway under this key — the bridge itself stores nothing.

## Arguments

| Argument | Type | Required | Notes |
|---|---|---|---|
| `agent` | string | no | Agent name to validate. The returned key works for any agent, but pre-validation surfaces typos early. |

## Return value

A text content block containing JSON with a `session_key` field — a fresh
UUID string.

## Example call

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"start_session","arguments":{"name":"researcher"}}}
```

Example result:

```json
{"session_key":"00000000-0000-4000-8000-000000000000"}
```

Then use it in `invoke_agent` as the `session_key` argument. The key is
opaque: it is sent to the gateway as the `x-openclaw-session-key` header and
is not bound to the agent it was generated against.

## Failure modes

- `unknown agent: {name}` — the optional `agent` argument names an agent not
  in `agents.json`. This is the only way `start_session` fails; omitting
  `agent` always succeeds.
- Session keys are generated client-side by the bridge (`randomUUID`), so
  key generation never touches the network and cannot fail on gateway
  problems. A key for a downed agent simply fails later in `invoke_agent`.

## Notes

- `invoke_hermes` does not accept session keys — Hermes one-shot mode does
  not preserve context across calls.
- To reset context, call `start_session` again and switch to the new key.
