---
title: agent_health
description: Check whether a specific OpenClaw fleet agent gateway is healthy
sidebar_position: 8
---

<!-- sources: index.ts -->

# agent_health

Check whether a specific fleet agent is healthy. Calls the agent gateway's
`GET /health` endpoint and returns its JSON body verbatim.

## Arguments

| Argument | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Agent name from `agents.json` |

## Return value

A text content block containing the raw JSON returned by the gateway's
`/health` endpoint. The shape is whatever the gateway emits — the bridge does
not transform it.

## Example call

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"agent_health","arguments":{"name":"researcher"}}}
```

Example result (gateway-specific):

```json
{"ok":true,"uptime":12345.6}
```

## Failure modes

| Error | Cause |
|---|---|
| `unknown agent: {name}` | Name not in `agents.json` |
| Abort/network error wrapped as `fleet-bridge error: ...` | Gateway unreachable, connection refused, or the call exceeded the timeout |

The health call is bounded by an abort timeout controlled by
`FLEET_BRIDGE_HEALTH_TIMEOUT_MS` (default `5000` milliseconds). A slow or
hung gateway aborts within that window and the call returns an error — there
is no retry.

Note that HTTP-level non-2xx responses are not explicitly checked: the bridge
returns whatever `/health` responds with (attempting to parse it as JSON), so
a gateway returning non-JSON on `/health` surfaces a JSON parse error rather
than a status code.
