---
title: Troubleshooting
description: Plate degradation, SSE disconnects, roster load failures, and other failure modes.
sidebar_position: 10
---

<!-- sources: server.ts, fleet.ts, plates.ts, ui/app.js, feed.ts, test/server.test.ts -->

## Plate degradation cases

The `needs_you` and `fleet_health` plates degrade to a bordered error slot
rather than crashing. The error strings in the slot map to causes:

| Error text | Cause | Fix |
|---|---|---|
| `CABINET_URL not configured` / `FLEET_HEALTH_URL not configured` | env var unset | set the URL and restart (URLs are read at startup) |
| `HTTP <status>` | backend answered non-2xx | check the backend's own health and auth |
| `unexpected /api/tasks shape` / `unexpected /fleet-health shape` | backend returned JSON that does not match the plate schema | verify the backend version; the plate trusts nothing it cannot validate |
| timeout message | backend slower than the 5 s abort timeout | check network path or backend latency |
| DNS / ECONNREFUSED text | backend unreachable | check host, port, and routing from the box host |

Degraded plates retry every 30 s and recover on their own — no restart
needed once the backend is healthy again. Before the first completed poll
both plates read `not polled yet`. The rest of the box keeps rendering
through any plate failure.

## SSE disconnect behavior

- Each client gets a full snapshot as its first `event: snapshot` frame,
  then periodic frames every 10 s, plus an immediate broadcast on every
  health transition.
- Client disconnects are handled: the response's `error` and `close`
  events evict it from the broadcast set, and error handlers are attached
  before the first write (a client that resets immediately cannot crash
  the server). A dead client never poisons later writes — the test suite
  covers mid-stream disconnect followed by continued serving.
- Server-side restart drops all connections; the browser's
  `EventSource` reconnects on its own and the next frame re-renders
  everything.
- If the clock's `LIVE` indicator is the only thing updating but data is
  stale, check that `/api/stream` still responds — frames stop only if
  the process is wedged (which would also stop `/api/snapshot`).

A malformed frame is ignored client-side (render is wrapped in
try/catch); the next snapshot re-renders. Frames identical to the previous
one are skipped.

## Roster load failures

Roster loading is deliberately non-fatal (`fleet.ts` `loadJson`): a
missing path, unreadable file, JSON parse error, or a document without an
`agents` array all load as an empty list. Symptoms:

- Tiles missing entirely with "no levers in the frame — roster empty.":
  the roster file did not load. Check the path in
  `FLEET_BRIDGE_AGENTS` / `FLEET_BRIDGE_HERMES` / `FLEET_BRIDGE_GENERIC`
  and validate the JSON.
- A single agent missing while others render: that entry failed schema
  expectations or points at a wrong `host`/`port`. Roster entries are used
  as-is — there is no per-entry validation or error surface in v1.
- Note there is no file watching: roster edits require a process restart.

## Tiles stuck idle or down

- Stuck `idle` on an OpenClaw or generic entry: the poll has not produced
  a health result. Check that the gateway answers HTTP GET at
  `http://host:port/healthPath` (default `/health`) and returns JSON.
- Stuck `down` right after a deploy: down persists until a poll succeeds —
  polls run every 10 s per agent with a 5 s timeout, so recovery is
  bounded by roughly one poll cycle after the gateway is healthy.
- `down` from non-JSON endpoints: a plain-text endpoint (for example a
  Prometheus-style metrics page) will never go `live` — the probe expects
  JSON with an `ok` field. Point `healthPath` at a JSON status route.
- Hermes tiles are always `idle` by design (no HTTP probe in v1); so are
  entries labeled `mcp`.

## Feed anomalies

- Feed empty but the fleet is clearly active: in v1 only health
  transitions generate entries — a quiet fleet genuinely produces no
  entries. The first poll after startup seeds without emitting anything.
- Feed lost after restart: the buffer is memory-only (500-entry cap).
  This is intended; the feed is a journal, not a store.
- Transition subscriber errors are logged to the server console
  (`[fleet] transition subscriber threw ...`) and do not stop polling.

## Other failure modes

- Startup exit code 1 with `cabinet-lite: <message>`: the listen failed —
  usually port 9100 already taken. Change `PORT` or free the port.
- Snapshot exposes nothing sensitive by construction (`token`,
  `ssh_user`, `binary` are stripped before any response); if you ever see
  a token in snapshot output, that is a bug — verify against
  `fleet.ts` `publicRoster()`.
- Use `npm test` (build plus Node's built-in test runner over
  `dist/test/*.test.js`) to exercise server, fleet, plates, and feed
  behaviors against mock gateways.
