---
title: Claude Code
description: Wiring fleet-bridge into Claude Code as a stdio MCP server
sidebar_position: 10
---

<!-- sources: README.md, docs/QUICKSTART.md, index.ts -->

# Claude Code

fleet-bridge is a stdio MCP server, so Claude Code launches it as a
subprocess. Transport is stdio only — there is no HTTP transport in v0.1.

## Server registration

Add the server to your MCP config (`command` + `args`, optional `env`):

```json
{
  "mcpServers": {
    "fleet-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/fleet-bridge/dist/index.js"]
    }
  }
}
```

If the rosters live outside the repo, or you want to override timeouts, set
them on the server entry:

```json
{
  "mcpServers": {
    "fleet-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/fleet-bridge/dist/index.js"],
      "env": {
        "FLEET_BRIDGE_AGENTS": "/absolute/path/to/agents.json",
        "FLEET_BRIDGE_HERMES": "/absolute/path/to/hermes-agents.json",
        "FLEET_BRIDGE_INVOKE_TIMEOUT_MS": "60000"
      }
    }
  }
}
```

If you installed the package (rather than running it from a checkout), the
`fleet-bridge` bin entry works too — keep `npm run build` current, since
`bin/fleet-bridge.js` just imports `dist/index.js`:

```json
{
  "mcpServers": {
    "fleet-bridge": {
      "command": "npx",
      "args": ["-y", "fleet-bridge"]
    }
  }
}
```

## Using the tools

After the server starts, Claude Code sees six tools: `list_agents`,
`agent_health`, `start_session`, `invoke_agent`, `list_hermes_agents`,
`invoke_hermes`. See the [tool catalog](../tools/index.md) for per-tool
reference.

Notes specific to driving the bridge from Claude Code:

- **Timeouts**: Claude Code applies its own timeout to MCP tool calls. If
  your agents routinely take longer than the client's budget, a longer
  `timeout_ms` on the call (or a raised `FLEET_BRIDGE_INVOKE_TIMEOUT_MS`)
  will not help unless the client's own ceiling is raised too — the client
  cancels the call first.
- **Progress**: Claude Code supports MCP progress notifications, so long
  `invoke_agent` calls emit live character-count updates when it passes a
  progress token.
- **Restart on roster change**: restarting the Claude Code session restarts
  the bridge and reloads rosters.

## Smoke test

Before wiring the client, verify the server standalone — see
[Getting started](../getting-started.md#smoke-test-without-an-mcp-client).
