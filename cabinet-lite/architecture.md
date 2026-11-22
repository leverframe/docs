---
title: Architecture
description: Process layout, modules, routes, and data flow of cabinet-lite.
sidebar_position: 3
---

<!-- sources: index.ts, server.ts, feed.ts, fleet.ts, plates.ts, ui/app.js, ui/index.html, tsconfig.json -->

## Process layout

cabinet-lite is one Node (>= 24, ESM) process. TypeScript compiles to
`dist/` (`tsc`, `module: nodenext`, strict). No framework, no dependencies
at runtime — `node:http`, `node:fs`, and `fetch` only.

| Module | Role |
|---|---|
| `index.ts` | entrypoint: starts the server, logs the listen line, handles SIGINT/SIGTERM via `instance.stop()` |
| `server.ts` | HTTP server, snapshot assembly, SSE broadcast, plate refresh loop |
| `fleet.ts` | roster loading, health polling, transition detection |
| `plates.ts` | plate fetchers (`fetchCabinetTasks`, `fetchFleetHealth`) and their types |
| `feed.ts` | in-memory ring buffer (`Feed`, cap 500, newest first) |
| `ui/index.html` | static shell: all CSS inline, no build step |
| `ui/app.js` | browser client: SSE listener + renderers |

## HTTP surface

Exactly four routes, served by a plain `http.createServer` handler.
Everything else is `404 not found`.

| Route | Method | Meaning |
|---|---|---|
| `/` | GET | `ui/index.html` |
| `/ui/app.js` | GET | `ui/app.js` |
| `/api/snapshot` | GET | full snapshot as JSON |
| `/api/stream` | GET | SSE; each event is `event: snapshot` with the full snapshot as data |

The server listens on `127.0.0.1` only. There are no POST/PUT/DELETE
handlers anywhere in v1 — read-only by absence.

## Snapshot shape

`server.ts` assembles one `Snapshot` object per render:

- `roster` — the public roster projection (`fleet.ts` `publicRoster()`):
  OpenClaw, Hermes, and generic slices with `token`, `ssh_user`, and
  `binary` stripped.
- `health` — name to health result for every probed agent (OpenClaw +
  generic; `ok`/`status` or `error`).
- `hermes` — name to `"ssh"` for Hermes entries (no HTTP probe exists for
  them in v1).
- `plates` — `needs_you` and `fleet_health` plate objects (see
  [plates](./plates.md)).
- `feed` — the ring buffer contents, newest first.

`/api/snapshot` serves this from cache only — no polling happens inside a
request (the test suite budgets it under 50 ms).

## Data flow

```text
 roster files            agent gateways            Cabinet / fleet-health
 (env-pointed)           (OpenClaw + generic)      (env-pointed URLs)
      |                        |                          |
      v                        v                          v
 +--------------------------------------------------------------+
 | fleet.ts                    plates.ts                        |
 |  loadRosters()               fetchCabinetTasks()             |
 |  poll every 10s              fetchFleetHealth()              |
 |  (250ms stagger, 5s timeout) every 30s                       |
 |        |                           |                         |
 |        v                           v                         |
 |  healthCache() + onTransition   cabinetPlate/fleetHealthPlate|
 |        |                           |                         |
 |        +------------+--------------+                         |
 |                     v                                        |
 |              server.ts snapshot()                            |
 |                     v                                        |
 |  feed.ts (ring buffer, 500 cap)  <--- transition entries     |
 |                     v                                        |
 |  broadcast: every 10s + immediately on each transition       |
 +--------------------------------------------------------------+
                      |
                      | SSE (event: snapshot) / GET /api/snapshot
                      v
               browser (ui/app.js)
                EventSource("/api/stream")
                renders banner, tiles, rhythm, feed, side rail
```

## UI client

`ui/app.js` opens one `EventSource("/api/stream")` and re-renders on every
`snapshot` event. It skips identical frames (`lastRaw` check) and wraps its
render pass in a try/catch: a bad frame never takes the box down — the next
snapshot re-renders. All dynamic strings are HTML-escaped before insertion.
The clock renders in `America/New_York`.

## Shutdown

`index.ts` registers SIGINT/SIGTERM handlers that call `instance.stop()`:
stops the fleet poller and plate loop, clears the broadcast interval,
destroys connected SSE clients, and closes the server.
