---
title: Getting started
description: Install, build, configure rosters, and smoke test fleet-bridge
sidebar_position: 2
---

<!-- sources: package.json, bin/fleet-bridge.js, README.md, docs/QUICKSTART.md, index.ts -->

# Getting started

## Prerequisites

- Node >= 18 (MCP SDK floor). Run a current LTS.
- One of:
  - an OpenClaw agent with its gateway enabled (HTTP port + auth token in its
    config), or
  - a Hermes CLI install on a host reachable via SSH with key-based auth (the
    bridge uses `BatchMode=yes`, so no password prompts).
- An MCP client that supports stdio servers.

## Install and build

```bash
git clone <repo-url> fleet-bridge
cd fleet-bridge
npm install
npm run build   # emits dist/index.js (tsc)
```

`package.json` scripts:

| Script | Command | What it does |
|---|---|---|
| `build` | `tsc` | Compiles `index.ts` to `dist/index.js` |
| `start` | `node dist/index.js` | Runs the built server |
| `dev` | `tsx index.ts` | Runs the TypeScript source directly |

The npm `bin` entry `fleet-bridge` (`bin/fleet-bridge.js`) is a two-line
wrapper that imports `../dist/index.js` — build first, then `npx
fleet-bridge` works from a global or local install.

## First-run configuration

Create `agents.json` in the repo root (or anywhere, via `FLEET_BRIDGE_AGENTS`):

```json
{
  "agents": [
    {
      "name": "researcher",
      "role": "Research Analyst",
      "tier": "pro",
      "model": "openclaw",
      "port": 18800,
      "host": "127.0.0.1",
      "token": "REPLACE_WITH_GATEWAY_TOKEN"
    }
  ]
}
```

Keep it `chmod 600`. Never commit it (it is gitignored by default).

For Hermes agents, create `hermes-agents.json` the same way — full schema in
[Configuration](./configuration.md).

OpenClaw users can generate the OpenClaw roster from live gateway configs
instead of hand-writing it (requires `jq`, run on the box hosting the agents):

```bash
bash scripts/build-agents.json.sh /tmp/agents.json
```

The script scans `$HOME/.openclaw-*/openclaw.json`, extracts each gateway port
and auth token, and writes the roster. Set `FLEET_HOST` if the agents are not
on `127.0.0.1`. Copy the output to `agents.json` or point `FLEET_BRIDGE_AGENTS`
at it.

**Rosters load once at startup.** Edit a roster, then restart the bridge (or
restart your MCP client, which restarts the bridge). No hot reload.

## Smoke test without an MCP client

Drive the stdio protocol directly. Substitute an agent name from your roster:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"invoke_agent","arguments":{"name":"researcher","prompt":"reply with exactly: pong"}}}' \
  | node dist/index.js
```

Expected:

- The `initialize` response carries `serverInfo` with
  `"name":"fleet-bridge"` and version `"0.1.1"`.
- `tools/list` returns six tools: `list_agents`, `agent_health`,
  `start_session`, `invoke_agent`, `list_hermes_agents`, `invoke_hermes`.
- The `tools/call` result contains the agent's reply.

To see progress notifications, add `"_meta":{"progressToken":"t1"}` to the
`tools/call` params — streaming invokes emit `notifications/progress` at least
once before the final result.

## Next steps

- Wire the bridge into a client: [Claude Code](./clients/claude-code.md),
  [Zed](./clients/zed.md), or [any MCP client](./clients/generic-mcp.md)
- Full tool reference: [Tools](./tools/index.md)
- Something not working: [Troubleshooting](./troubleshooting.md)
