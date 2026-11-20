---
title: Zed
description: Wiring fleet-bridge into Zed as a stdio MCP server
sidebar_position: 11
---

<!-- sources: README.md, docs/QUICKSTART.md, index.ts -->

# Zed

Zed speaks MCP over stdio. fleet-bridge registers like any other
command-based MCP server.

## Server registration

Add an entry to the `context_servers` (or `mcp_servers`, depending on your
Zed version) map in `settings.json`:

```json
{
  "context_servers": {
    "fleet-bridge": {
      "source": "custom",
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

The key requirement is that `command` + `args` launch the built server —
`dist/index.js` must exist (`npm run build`). The `env` map is where roster
paths and timeout overrides go.

Zed's exact configuration keys have shifted across releases (`context_servers`
vs `mcp_servers`, `source: "custom"`); check Zed's current MCP docs for the
map name in your version. The server-side shape (`command`, `args`, `env`) is
identical in all of them.

## Using the tools

Once connected, Zed's assistant sees the six tools: `list_agents`,
`agent_health`, `start_session`, `invoke_agent`, `list_hermes_agents`,
`invoke_hermes`. See the [tool catalog](../tools/index.md).

- **Progress notifications**: `invoke_agent` and `invoke_hermes` emit
  `notifications/progress` when the client passes `_meta.progressToken`.
  Clients that do not pass one (or do not render progress) still get the
  same final result — the notifications are purely additive.
- **Timeouts**: Zed applies its own call timeout on top of the bridge's.
  A bridge-side `timeout_ms` longer than the client budget means the client
  cancels first.
- **Roster reload**: restart the server (or the Zed session) after editing
  `agents.json` / `hermes-agents.json` — rosters load once at startup.

## Smoke test

Verify standalone first — see
[Getting started](../getting-started.md#smoke-test-without-an-mcp-client).
