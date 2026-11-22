---
title: Invoke panel
description: The invoke panel is wired in the UI but GO-gated OFF in v1. What flipping it would mean.
sidebar_position: 7
---

<!-- sources: ui/index.html, ui/app.js, server.ts -->

## v1 state: GO-gated OFF

The invoke panel sits at the bottom of the main column: an agent picker, a
prompt input ("pull a lever — prompt…"), and a PULL button. All of it is
present but inert in v1:

- The PULL button renders with the `disabled` attribute and the title
  `GO-gated — v2`; its cursor is `not-allowed`.
- The server exposes no endpoint a submission could hit. The route table is
  `/`, `/ui/app.js`, `/api/snapshot` (GET), `/api/stream` (GET), and 404
  for everything else. There is no POST handler anywhere in the codebase.
- `ui/app.js` wires no submit listener — it only renders the agent picker
  options from the OpenClaw roster slice.

**There is no gate flag or env var to flip in v1.** The gate is structural:
the disabled button plus the absence of an invoke route. Nothing in
`server.ts`, `plates.ts`, or the environment reads a toggle for it, so
documented overrides would be invented — if you find a config that "enables
invoke," it does not exist.

## What flipping it would mean

The GO-gate is a deliberate line between the two kinds of state the box
could touch:

- **Reads (v1):** the box watches fleet state and cabinet state. Degrading
  a plate or a probe writes nothing.
- **Writes (v2, gated):** pulling a lever would issue an action to an
  agent gateway — an invocation of a named agent with a prompt. That is a
  write against the fleet, not against the box's own state. Cabinet state
  stays off-limits even then (see the write-off-limits rule in
  [plates](./plates.md)).

Enabling invoke in a future version requires three things the codebase has
already reserved for: the `busy` tile state and lever-throw animation
(styled but unassigned), the roster `token` field (loaded, but stripped
from every API response — "used only server-side if invoke lands in v2"),
and the Hermes `ssh_user` / `binary` fields (loaded, stripped, documented
as v2). Until all three are wired, the panel stays gated.
