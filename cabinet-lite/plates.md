---
title: Plates
description: The plate contract and the two v1 plates — needs_you (Cabinet) and fleet_health.
sidebar_position: 4
---

<!-- sources: plates.ts, server.ts, ui/app.js, docs/CONFIG.md -->

## The plate contract

A plate is one bolted-in instrument backed by one backend subsystem. The
contract, from `plates.ts`:

- Each plate is a discriminated union: an `ok: true` variant carrying data,
  or an `ok: false` variant carrying a single `error` string.
- Every fetch is bounded by a timeout (5 s default, `AbortController`).
- A non-2xx response becomes `HTTP <status>`.
- A response whose JSON shape does not match the expected schema becomes
  `unexpected <path> shape` — the plate does not trust the backend.
- Any transport failure (DNS, refused, timeout) becomes the error message.

**Degrade behavior:** an unset URL, an unreachable backend, a timeout, or a
bad shape degrades the plate to an error state. The server never crashes on
plate failure; it keeps the last plate object and retries on the next cycle
(every 30 s, `PLATE_INTERVAL_MS = 30_000` in `server.ts`). Before the first
completed poll both plates read `not polled yet`.

The UI renders a degraded plate as a bordered empty slot with the error
text — never a crash, never a blank wall. Everything else keeps rendering.

## needs_you (Cabinet)

- Backend: the Cabinet task queue, read-only.
- URL: `CABINET_URL` env var (or the `cabinetUrl` server option). Unset =
  plate degrades with `CABINET_URL not configured`.
- What it reads: `GET {CABINET_URL}/api/tasks?state=active`. Accepts either
  a bare task array or `{"tasks": [...]}`.
- Task shape (`CabinetTask` in `plates.ts`): `id`, `title`,
  `assigned_to`, `priority`, `state`, `claimed_by`, `created_at`,
  `due_at`, `fail_count`.
- What renders: the NEEDS YOU attention banner at the top of the box.
  - Tasks present: up to 6 chips (`assigned_to` or `unassigned` plus the
    task title), then `+N more`, then the total count CTA. Banner is amber.
  - Zero tasks: the clear message — "nothing. interlock clear — N levers
    healthy, 0 conflicts." Banner goes gray.
  - Degraded: "cabinet offline — \<error\>".

### Write-off-limits

cabinet-lite reads the Cabinet production instance and never writes to it.
The only request it ever makes is the `GET /api/tasks?state=active` above.
Claiming, completing, or editing cabinet tasks stays in Cabinet itself —
"supervisors supervise" means the box watches the queue, it does not touch
it. There is no POST path in the v1 codebase at all.

## fleet_health

- Backend: the fleet-health aggregate endpoint.
- URL: `FLEET_HEALTH_URL` env var (or the `fleetHealthUrl` server option).
  Unset = plate degrades with `FLEET_HEALTH_URL not configured`.
- What it reads: `GET {FLEET_HEALTH_URL}/fleet-health`.
- Required response shape: `healthy` (number), `total` (number),
  `threshold` (number), `status` (string). Anything else is
  `unexpected /fleet-health shape`.
- What renders: the plate surface in the header area reflects the
  aggregate — e.g. 18 of 20 healthy against threshold 18 with status `ok`.
  A degraded render shows the error string instead.

Both plates are included verbatim in every snapshot and SSE frame under
`plates.needs_you` and `plates.fleet_health`.
