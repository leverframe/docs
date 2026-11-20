---
title: Generic MCP clients
description: Connecting fleet-bridge to any stdio MCP client, plus the raw protocol
sidebar_position: 12
---

<!-- sources: index.ts, README.md, docs/QUICKSTART.md -->

# Generic MCP clients

fleet-bridge implements MCP over **stdio only** (JSON-RPC 2.0 on stdin and
stdout, via `StdioServerTransport`). There is no HTTP transport in v0.1. Any
client that can spawn a subprocess and speak stdio MCP can use it.

## Minimal wiring shape

Virtually every stdio MCP client uses the same three fields:

| Field | Value |
|---|---|
| `command` | `node` (or `npx`) |
| `args` | absolute path to `dist/index.js` (the built server) |
| `env` | optional: `FLEET_BRIDGE_AGENTS`, `FLEET_BRIDGE_HERMES`, timeout overrides |

```json
{
  "mcpServers": {
    "fleet-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/fleet-bridge/dist/index.js"],
      "env": {
        "FLEET_BRIDGE_AGENTS": "/absolute/path/to/agents.json",
        "FLEET_BRIDGE_HERMES": "/absolute/path/to/hermes-agents.json"
      }
    }
  }
}
```

Where the block lives (`mcpServers`, `context_servers`, a TOML equivalent)
is client-specific; the values are not.

## Server metadata

On `initialize`, the bridge reports:

- `serverInfo.name`: `fleet-bridge`
- `serverInfo.version`: the package version (e.g. `0.1.1`)
- `capabilities.tools`: advertised

## Raw protocol smoke test

No client needed — pipe JSON-RPC lines into the server:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node dist/index.js
```

`tools/list` returns the six tools with their input schemas — this is the
authoritative contract for building your own client integration.

## Protocol notes for implementers

- **Tool results**: every tool returns a single text content block. `invoke_*`
  tools return the agent reply text; `list_*` tools return pretty-printed
  JSON; `start_session` returns JSON with a `session_key` field. Errors come
  back as `isError: true` results with a `fleet-bridge error: ...` text block
  — not as JSON-RPC protocol errors.
- **Progress**: pass `_meta.progressToken` in the `tools/call` params to
  receive `notifications/progress` messages from `invoke_agent` and
  `invoke_hermes`. Progress `total` is always `-1` (unknown);
  `progress` carries the accumulated output character count.
- **Cancellation**: the bridge has no client-driven cancellation path; the
  only stop conditions are its own timeouts or the client closing the stdio
  connection.

## Known MCP clients

Documented wiring guides: [Claude Code](./claude-code.md) and
[Zed](./zed.md).
