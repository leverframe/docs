---
title: Tools
description: Catalog of the six MCP tools fleet-bridge exposes
sidebar_position: 4
---

<!-- sources: index.ts, README.md -->

# Tools

fleet-bridge exposes exactly six tools via `tools/list`. OpenClaw tools
target `agents.json` entries; Hermes tools target `hermes-agents.json`
entries.

| Tool | Arguments | Target runtime | State |
|---|---|---|---|
| [`list_agents`](./list-agents.md) | none | OpenClaw | - |
| [`agent_health`](./agent-health.md) | `name` (required) | OpenClaw | - |
| [`start_session`](./start-session.md) | `agent` (optional) | OpenClaw | generates session key |
| [`invoke_agent`](./invoke-agent.md) | `name`, `prompt` (required); `timeout_ms`, `session_key` (optional) | OpenClaw | multi-turn via `session_key` |
| [`list_hermes_agents`](./hermes.md) | none | Hermes | - |
| [`invoke_hermes`](./hermes.md) | `name`, `prompt` (required); `timeout_ms` (optional) | Hermes | always stateless |

## Shared behavior

- **Errors**: any failure (unknown agent, HTTP error, timeout, ssh failure)
  returns `isError: true` with a text block beginning `fleet-bridge error:`.
- **Unknown tool names** return `fleet-bridge error: unknown tool: <name>`.
- **Progress notifications**: `invoke_agent` and `invoke_hermes` emit
  `notifications/progress` when the client passes `_meta.progressToken` in the
  call params. Clients without it get the same final result with no
  intermediate updates.
- **Token stripping**: `list_agents` strips `token`;
  `list_hermes_agents` strips `ssh_user` and `binary`. No tool output ever
  contains credentials.
