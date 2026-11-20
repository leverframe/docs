---
title: Configuration
description: Complete schema for agents.json, hermes-agents.json, and environment variables
sidebar_position: 3
---

<!-- sources: index.ts, agents.example.json, hermes-agents.example.json, docs/CONFIG.md, docs/SCHEMA-NOTES.md -->

# Configuration

fleet-bridge is configured entirely through two JSON roster files plus
environment variables. No CLI flags, no config wizard.

## How rosters load

At startup the bridge reads both rosters once, at module load:

| File | Contents | Path source |
|---|---|---|
| `agents.json` | OpenClaw agents (HTTP gateway) | `FLEET_BRIDGE_AGENTS`, default `<repoRoot>/agents.json` |
| `hermes-agents.json` | Hermes agents (SSH + CLI) | `FLEET_BRIDGE_HERMES`, default `<repoRoot>/hermes-agents.json` |

Both files use the same top-level shape: `{"agents": [ ... ]}` — one array
entry per agent.

On a missing or unparseable file the bridge falls back to an empty roster for
that type and keeps running; every invoke tool then returns `unknown agent`
until a valid file is supplied.

**There is no runtime validation.** A roster with a missing or mistyped field
loads fine and fails later — at invoke time — or silently. Validate by hand
before the first invoke. Duplicate `name` values: first match wins; the
duplicate is unreachable.

**Rosters load once.** Edit a roster, then restart the bridge. Keep both
files `chmod 600`; they are gitignored and contain secrets.

## agents.json — OpenClaw agents

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

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Unique. The value clients pass to `invoke_agent`, `agent_health`, and `start_session`. |
| `role` | string | yes | Free text, shown in `list_agents` output. |
| `tier` | string | no | Your own metadata (e.g. `pro`, `free`). Pass-through only; the bridge never reads it. |
| `model` | string | no | Model name sent in the chat-completions body. Defaults to `openclaw` when omitted, which is what OpenClaw gateways expect. Set a real model name to target any OpenAI-compatible gateway. |
| `port` | number | yes | Gateway port. The bridge calls `http://{host}:{port}/health` and `/v1/chat/completions`. |
| `host` | string | yes | IP or hostname of the gateway. |
| `token` | string | yes | Gateway auth token, sent as `Authorization: Bearer {token}`. |

`token` is a secret. It is stripped from `list_agents` output and never
appears in any tool result. Never commit the file, never paste real tokens
into examples or issues.

## hermes-agents.json — Hermes agents

```json
{
  "agents": [
    {
      "name": "scribe",
      "role": "Technical Writer",
      "model": "gemini-2.5-flash",
      "host": "127.0.0.1",
      "ssh_user": "deploy",
      "binary": "/usr/local/bin/hermes"
    }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Unique. Passed to `invoke_hermes` and `list_hermes_agents`. |
| `role` | string | yes | Free text, shown in `list_hermes_agents` output. |
| `model` | string | no | Display metadata only; the bridge never reads it. |
| `host` | string | yes | Host the bridge SSHes into. |
| `ssh_user` | string | yes | Remote SSH user. Key-based auth must already work (`BatchMode=yes` — no password prompts). |
| `binary` | string | yes | Absolute path to the Hermes CLI on the remote host. Invoked as `ssh {ssh_user}@{host} {binary} -z '<prompt>'`. |

`ssh_user` and `binary` are stripped from `list_hermes_agents` output (they
leak your infra layout to anyone with client access). `model` is displayed.

## Complete example config

OpenClaw roster with three agents (one with no optional fields beyond the
required set) and one Hermes agent:

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
    },
    {
      "name": "coder",
      "role": "Full-Stack Developer",
      "tier": "pro",
      "port": 18801,
      "host": "127.0.0.1",
      "token": "REPLACE_WITH_GATEWAY_TOKEN"
    },
    {
      "name": "reviewer",
      "role": "Code Review",
      "tier": "free",
      "port": 18802,
      "host": "127.0.0.1",
      "token": "REPLACE_WITH_GATEWAY_TOKEN"
    }
  ]
}
```

```json
{
  "agents": [
    {
      "name": "scribe",
      "role": "Technical Writer",
      "model": "gemini-2.5-flash",
      "host": "127.0.0.1",
      "ssh_user": "deploy",
      "binary": "/usr/local/bin/hermes"
    }
  ]
}
```

Copy `agents.example.json` and `hermes-agents.example.json` from the repo
root as skeletons.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `FLEET_BRIDGE_AGENTS` | `<repoRoot>/agents.json` | Path to the OpenClaw roster. |
| `FLEET_BRIDGE_HERMES` | `<repoRoot>/hermes-agents.json` | Path to the Hermes roster. |
| `FLEET_BRIDGE_HEALTH_TIMEOUT_MS` | `5000` | Abort timeout for `agent_health` HTTP calls. |
| `FLEET_BRIDGE_INVOKE_TIMEOUT_MS` | `60000` | Default timeout for `invoke_agent` / `invoke_hermes` when the call omits `timeout_ms`. |

Non-numeric or non-positive values for the two timeout variables fall back
silently to the default. A per-call `timeout_ms` tool argument overrides the
invoke default when set.

## Transport security

The bridge speaks plain `http://` to agent gateways. Run it on a network you
trust (loopback, LAN, or a private overlay). There is no TLS option in v0.1.
