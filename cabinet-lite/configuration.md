---
title: Configuration
description: Full environment variable and roster file reference for cabinet-lite.
sidebar_position: 8
---

<!-- sources: server.ts, fleet.ts, plates.ts, docs/CONFIG.md -->

cabinet-lite is configured entirely through environment variables and
roster files. It has no config file of its own.

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `FLEET_BRIDGE_AGENTS` | (unset) | path to the OpenClaw roster JSON |
| `FLEET_BRIDGE_HERMES` | (unset) | path to the Hermes roster JSON |
| `FLEET_BRIDGE_GENERIC` | (unset) | path to the generic-runtime roster JSON |
| `CABINET_URL` | (unset) | Cabinet base URL, read-only; unset degrades the `needs_you` plate |
| `FLEET_HEALTH_URL` | (unset) | fleet-health aggregate base URL; unset degrades the `fleet_health` plate |
| `PORT` | `9100` | listen port (read once at startup) |

All roster paths are read at startup into memory; the files are re-read
only on process restart. URLs accept any base the Node `fetch` can reach
(`new URL(path, base)` resolution). The server always binds `127.0.0.1` —
there is no host/interface option.

Programmatic alternatives: `startServer()` accepts `port`, `agentsPath`,
`hermesPath`, `genericPath`, `cabinetUrl`, `fleetHealthUrl`, `uiDir`,
`pollIntervalMs`, and `plateIntervalMs` directly, overriding the env vars.
Fixed intervals in code: fleet poll 10 s, plate refresh 30 s, SSE broadcast
10 s.

## Roster files

All rosters are `{"agents": [...]}` documents in the same shape as
fleet-bridge's `agents.json` / `hermes-agents.json`.

### OpenClaw roster (`FLEET_BRIDGE_AGENTS`)

```json
{
  "agents": [
    {
      "name": "<openclaw-agent>",
      "role": "repo janitor",
      "tier": "worker",
      "model": "glm-5.3-flash",
      "port": 18800,
      "host": "agent-host-1",
      "token": "gateway-token-here"
    }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | agent name — key for health lookups and feed entries |
| `role` | yes | one-line role, shown on the lever tile |
| `tier` | no | fleet tier (e.g. `worker`) |
| `model` | no | model the agent runs |
| `host` | yes | hostname reachable from the box |
| `port` | yes | gateway port — polled at the health path |
| `token` | yes | gateway token; never leaves the box (v2 use) |
| `runtime` | no | display label; defaults to `openclaw` |
| `healthPath` | no | probe path; defaults to `/health` |

### Hermes roster (`FLEET_BRIDGE_HERMES`)

```json
{
  "agents": [
    {
      "name": "<hermes-agent>",
      "role": "PM",
      "model": "gemini-flash",
      "host": "agent-host-1",
      "ssh_user": "deploy-user",
      "binary": "hermes"
    }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | agent name |
| `role` | yes | one-line role, shown on the lever tile |
| `model` | no | model the agent runs |
| `host` | yes | host the agent lives on |
| `ssh_user` | yes | SSH user for Hermes invocations (v2) |
| `binary` | yes | Hermes binary path/name on the host (v2) |
| `runtime` | no | display label; defaults to `hermes` |

Hermes entries are not polled in v1 — they render static `idle` tiles and
report `"ssh"` status in the snapshot.

### Generic runtime roster (`FLEET_BRIDGE_GENERIC`)

Any HTTP-probeable agent joins the box as a roster line — the runtime label
is data, not a code branch. Generic entries poll exactly like OpenClaw
entries (same timeout, stagger, cache, live-down transitions) at their own
`healthPath`. Tokens are optional; gateways may be unauthenticated.

```json
{
  "agents": [
    {
      "name": "search-agent",
      "role": "search",
      "host": "agent-host-1",
      "port": 18080,
      "runtime": "khoj",
      "healthPath": "/status"
    },
    {
      "name": "collector",
      "role": "otel collector",
      "host": "agent-host-1",
      "port": 14317,
      "healthPath": "/api/status"
    }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | agent name |
| `role` | yes | one-line role, shown on the lever tile |
| `host` | yes | hostname reachable from the box |
| `port` | yes | port on the host |
| `healthPath` | yes in practice | probe path; omitting polls `/health`. Must return JSON (e.g. an object with `ok: true`) — text endpoints render the tile `down` |
| `runtime` | no | display label; defaults to `openclaw` |
| `model` | no | model the agent runs |
| `token` | no | optional gateway token (never leaves the box) |

Entries without `runtime` default by file: OpenClaw and generic lines to
`openclaw`, Hermes lines to `hermes`. The UI badge map styles
`openclaw`/`hermes`/`mcp`; any other label renders in the generic steel
badge style, and the RUNTIMES side-rail lists every distinct label present.

## Plate enablement

Plates are enabled by URL, not by flags. Setting `CABINET_URL` /
`FLEET_HEALTH_URL` turns the corresponding plate on; leaving them unset
degrades it to its error state (the UI renders a bordered empty slot).
There is no separate enable/disable toggle. See
[plates](./plates.md) for the full degrade contract.

## Secrets never reach the browser

`token`, `ssh_user`, and `binary` are stripped from every API response.
The server builds the public roster projection before any snapshot or SSE
frame leaves the process. The test suite asserts the raw snapshot JSON
never contains these values.

## Port and host options

- Port: `PORT` env var or the `port` server option; default `9100`.
- Bind address: hardcoded `127.0.0.1`. To expose the box beyond loopback,
  front it with a reverse proxy — the process itself will never listen on
  an external interface. Note there is no authentication on any route.
