---
title: Getting started
description: Prerequisites, install, run, and first-run checklist for cabinet-lite.
sidebar_position: 2
---

<!-- sources: package.json, server.ts, index.ts, README.md, docs/CONFIG.md -->

## Prerequisites

- Node.js >= 24 (enforced by `engines` in `package.json`)
- Two roster files, same shape as fleet-bridge's `agents.json` /
  `hermes-agents.json`. See [configuration](./configuration.md) for the
  schemas. A third generic-runtime roster is optional.
- Reachable backends if you want both plates live: a Cabinet instance and a
  fleet-health aggregate (both optional — unset URLs degrade the plates, see
  [plates](./plates.md)).

## Install, build, run

```bash
npm ci
npm run build
npm start
```

`package.json` scripts:

| Script | Command | Meaning |
|---|---|---|
| `build` | `tsc` | compile TypeScript to `dist/` |
| `start` | `node dist/index.js` | run the box |
| `dev` | `tsc --watch` | rebuild on change |
| `test` | build + `node --test "dist/test/*.test.js"` | run the test suite |

## Environment variables

| Var | Required | Default | Meaning |
|---|---|---|---|
| `FLEET_BRIDGE_AGENTS` | yes (for OpenClaw agents) | unset | path to the OpenClaw roster JSON |
| `FLEET_BRIDGE_HERMES` | yes (for Hermes agents) | unset | path to the Hermes roster JSON |
| `FLEET_BRIDGE_GENERIC` | no | unset | path to the generic-runtime roster JSON |
| `CABINET_URL` | no | unset | Cabinet base URL, consumed read-only; unset = `needs_you` plate degrades |
| `FLEET_HEALTH_URL` | no | unset | fleet-health aggregate base URL; unset = `fleet_health` plate degrades |
| `PORT` | no | `9100` | listen port |

Notes:

- With both roster vars unset, the box starts with an empty roster — valid,
  but the tile wall renders its empty state.
- A missing or malformed roster file is not a startup error: it loads as an
  empty agent list. See [troubleshooting](./troubleshooting.md).
- `PORT` is read at startup only (`server.ts` falls back to `9100`).

## First run

The box binds to loopback only — it listens on `127.0.0.1`, never on all
interfaces.

1. Start the process. On success it logs
   `cabinet-lite: listening on port 9100` (or your `PORT`). On a bind error
   it logs `cabinet-lite: <message>` and exits 1.
2. Open `http://127.0.0.1:9100`.
3. Checklist:
   - Top-right clock ticks and shows `LIVE` (SSE connected).
   - NEEDS YOU banner shows either chips, the clear message, or the
     offline message — never "connecting…" for more than a few seconds.
   - Lever tiles appear for every roster entry; each has a state dot.
   - The PULL button in the invoke panel is disabled with title
     `GO-gated — v2`.
   - `GET /api/snapshot` returns JSON and does not contain any roster
     `token`, `ssh_user`, or `binary` values.
