---
title: Self-Hosting
sidebar_position: 7
description: The docker compose appliance, the FastAPI runner, and deprecated infrastructure services.
---

<!-- sources: docker-compose.yml, infra/docker-compose.yml, .env.example, api/config.py, api/main.py, api/agents/router.py, benchmarks/Dockerfile, benchmarks/README.md, docs/DEPRECATION.md -->

# Self-Hosting

## What compose actually ships

The repository has two compose files. Only the root one defines active services.

### Root `docker-compose.yml` — benchmark appliance

`docker compose up killer-bench` reproduces the killer benchmark (Tractum vs CrewAI vs single Claude, blind judge, N runs) from cold. The reviewer brings only an Anthropic API key; compose handles the relay, the Python image, the deps, and stages the report to a mounted volume.

| Service | Image | Purpose | Ports |
|---|---|---|---|
| `relay` | `golang:1.26-alpine` (builds `fiatjaf/nak` from source into `/go/bin/nak`) | Reference Nostr relay (`nak serve`) for the test suite and `buzz_consensus_demo.py` | `10547:10547` |
| `killer-bench` | built from `benchmarks/Dockerfile` as `tractum/killer-bench:latest` | Runs `benchmarks/run.sh`, which validates the key, runs `examples/killer_demo.py`, and copies the report out | none |

Details:

- `killer-bench` depends on `relay` with `condition: service_healthy` (the relay healthcheck is `nc -z localhost 10547`; a WebSocket relay returns 404 to plain HTTP GETs, so TCP check is the right signal).
- Environment variables read from the host shell:
  - `ANTHROPIC_API_KEY` — **required** (compose fails without it).
  - `KILLER_DEMO_RUNS` — number of benchmark runs, default `10`.
  - `TRACTUM_TEST_RELAY` — set to `ws://relay:10547` inside the appliance.
- Volume: `./benchmarks/out:/app/benchmarks/out` — the report lands on the host at `benchmarks/out/killer_demo_results.md`, no `docker cp` needed.

### `infra/docker-compose.yml` — deprecated, fully commented out

Every service in this file (PostgreSQL 16, Redis 7, NATS 2.10 with JetStream) is commented out and marked deprecated. They belonged to the old Claude-Flow federation architecture (multi-tenancy, billing, templates). The current core runtime uses asyncio queues for messaging, in-memory state, and no persistence. Nothing needs to be uncommented to run the SDK.

## FastAPI runner (optional)

Install the `runner` extra to run the control plane that bridges to the core `Runtime`:

```bash
pip install tractum[runner]
```

Configuration comes from environment variables with the `CLAUDWAY_` prefix (`api/config.py`, pydantic-settings, also reads a `.env` file). Active settings:

| Env var | Default | Meaning |
|---|---|---|
| `CLAUDWAY_API_HOST` | `0.0.0.0` | Bind host |
| `CLAUDWAY_API_PORT` | `8000` | Bind port |
| `CLAUDWAY_DEBUG` | `false` | Debug mode |
| `CLAUDWAY_SECRET_KEY` | `change-me-in-production` | JWT signing secret |
| `CLAUDWAY_ALGORITHM` | `HS256` | JWT algorithm |
| `CLAUDWAY_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime |

Deprecated settings still present in the schema (`CLAUDWAY_DATABASE_URL`, `CLAUDWAY_REDIS_URL`, `CLAUDWAY_NATS_URL`, `CLAUDWAY_CLAUDE_FLOW_URL`, `CLAUDWAY_STRIPE_*`, `CLAUDWAY_RATE_LIMIT_*`) are not used by the current runtime — multi-tenancy, billing, templates, and gateway routes are archived under `api/platform-deprecated/` and their routers are commented out in `api/main.py`. A sample `.env` covering the full deprecated schema is in `.env.example`; treat it as reference, not as a required file.

### HTTP surface

The app mounts one active router (`api/agents/router.py`) under the prefix `/v1/agents`, plus a health endpoint:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe; returns `{"status": "healthy", "version": "0.1.0"}` |
| POST | `/v1/agents/` | Deploy a swarm (`DeployAgentRequest`: `name`, `description`, `agents`, optional `template_id`, `config`) — 201 |
| GET | `/v1/agents/` | List agents across swarms (`status`, `limit=100`, `offset=0` query params) |
| POST | `/v1/agents/{swarm_id}/task` | Submit a task to a swarm (`SendMessageRequest`: `task_description`, `task_data`, optional `user_id`) |
| POST | `/v1/agents/coordinator` | Create a coordinator with specialists (`CreateCoordinatorRequest`: `name`, `specialists`) — 201 |
| GET | `/v1/agents/status` | Runtime status snapshot |

A `dashboard/` directory ships a Next.js frontend for the runner (separate `package.json`, run with its own toolchain; it is not part of the SDK wheel — `pyproject.toml` installs only the `tractum` package).

## What you do not need to host

- No database, Redis, or NATS for the SDK or the MCP server.
- No relay unless you want the Nostr transport exercised locally — `nak serve --port 10547` (or the compose `relay` service) is enough, and clients point at it via `TRACTUM_TEST_RELAY` / `TRACTUM_DEMO_RELAY`.
- No key management service — pin the operator with `TRACTUM_SIGNING_KEY` (hex Ed25519 private key) and per-agent identity with `AgentConfig.signing_key`.
