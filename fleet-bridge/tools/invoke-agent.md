---
title: invoke_agent
description: Send a prompt to an OpenClaw gateway agent and return its reply
sidebar_position: 6
---

<!-- sources: index.ts, agents.example.json -->

# invoke_agent

Send a prompt to an OpenClaw fleet agent and return its reply. The bridge
POSTs to the agent gateway's `/v1/chat/completions` with `stream: true` and
accumulates the streamed delta content into a single reply.

## Arguments

| Argument | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Agent name from `agents.json` (e.g. `researcher`) |
| `prompt` | string | yes | User message to send |
| `timeout_ms` | number | no | Timeout in milliseconds. Default: `60000`, or the `FLEET_BRIDGE_INVOKE_TIMEOUT_MS` value. |
| `session_key` | string | no | Session key from `start_session` for multi-turn conversation. When absent, the call is stateless. |

## Return value

A text content block containing the agent's full reply text.

## Behavior details

- **Request shape**: `POST http://{host}:{port}/v1/chat/completions` with
  `Authorization: Bearer {token}`, body `{"messages":[{"role":"user",
  "content": prompt}], "model": {model}, "stream": true}`. The model defaults
  to `openclaw` when the roster entry omits `model`. A `session_key` is sent
  as the `x-openclaw-session-key` header; the gateway persists conversation
  state under that key — the bridge stores nothing.
- **Streaming**: responses are read as SSE-style `data:` lines; `[DONE]` ends
  the stream and the accumulated text is returned. If the response has no
  body (non-streaming gateway), the bridge falls back to parsing
  `choices[0].message.content` from the JSON response.
- **Timeout**: an `AbortController` aborts the fetch at `timeout_ms`. On
  abort, the call fails with an error like `fleet-bridge error: This operation
  was aborted`. There is no partial-reply recovery — a timed-out invoke is
  lost. The default ceiling is 60 seconds (60000 ms); raise it per call for
  slow agents. Clients with their own turn budgets below this value may
  cancel sooner.
- **Progress notifications**: when the call carries `_meta.progressToken`,
  the bridge emits `notifications/progress` with the accumulated character
  count at most every 2 seconds (or roughly every 500 characters), with
  `total` set to `-1` (unknown) and messages like
  `Connecting to researcher...` then `Generated 1234 chars`.
- **HTTP errors**: a non-OK status fails with
  `HTTP {status} from {name}: {first 200 chars of body}`.

## Example call

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"invoke_agent","arguments":{"name":"researcher","prompt":"reply with exactly: pong"}}}
```

Multi-turn, reusing a session from `start_session`:

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"invoke_agent","arguments":{"name":"researcher","prompt":"what did I just ask you?","session_key":"<session-key-from-start-session>","timeout_ms":120000},"_meta":{"progressToken":"t1"}}}
```

## Failure modes

| Error | Cause |
|---|---|
| `unknown agent: {name}` | Name not in `agents.json` — typo, or the roster failed to load (empty roster fallback) |
| `HTTP {status} from {name}: ...` | Gateway returned a non-OK status — bad token (401/403), gateway down, endpoint missing |
| `unexpected response shape from {name}` | Non-streaming response lacked `choices[0].message.content` |
| `fleet-bridge error: This operation was aborted` | Timeout exceeded; no reply is returned |
| Connection refused / fetch network error | Wrong `host`/`port`, or the gateway service is down |
