---
title: list_agents
description: List OpenClaw fleet agents reachable through the bridge
sidebar_position: 5
---

<!-- sources: index.ts, agents.example.json -->

# list_agents

List OpenClaw fleet agents reachable through this bridge. Returns the roster
as a JSON array with the auth `token` stripped from every entry.

## Arguments

None. The input schema is an empty object.

## Return value

A text content block containing JSON — the `agents.json` roster with only the
`token` field removed. All other fields (`name`, `role`, `tier`, `model`,
`port`, `host`) are included as loaded, even when empty or absent.

## Example call

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_agents","arguments":{}}}
```

Example result for the roster in [Configuration](../configuration.md):

```json
[
  {
    "name": "researcher",
    "role": "Research Analyst",
    "tier": "pro",
    "model": "openclaw",
    "port": 18800,
    "host": "127.0.0.1"
  },
  {
    "name": "reviewer",
    "role": "Code Review",
    "tier": "free",
    "port": 18802,
    "host": "127.0.0.1"
  }
]
```

## Failure modes

- Empty roster (missing or unparseable `agents.json`): returns an empty
  array — the bridge falls back to `{"agents": []}` at startup. This is the
  signal that your roster path is wrong; see
  [Troubleshooting](../troubleshooting.md).
- The roster is read at startup, so agents added to the file after launch do
  not appear until the bridge restarts.
