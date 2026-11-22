---
slug: /
title: cabinet-lite
description: The Leverframe signal box — a read-only cross-runtime fleet dashboard for OpenClaw, Hermes, and MCP agents.
sidebar_position: 1
---

<!-- sources: README.md, package.json, server.ts, plates.ts, ui/app.js, docs/CONFIG.md -->

cabinet-lite is a read-only dashboard for an agent fleet. It is the
"Leverframe signal box": one page, rendered as a flat industrial panel, that
shows what a fleet of OpenClaw, Hermes, and MCP agents is doing right now.

It is a single Node process that loads roster files, polls agent health
endpoints, polls two backend plates, and pushes a snapshot to any connected
browser over Server-Sent Events. There is no database, no auth layer, and no
write path.

## The four questions

The box is organized around four questions:

| Question | Surface | Status in v1 |
|---|---|---|
| What needs me? | The `needs_you` plate (attention banner) | live |
| Who's free? | Lever tiles with live/down/idle states | live |
| What happened? | The pull feed with runtime provenance | live |
| Act from here? | The invoke panel | wired, GO-gated OFF |

See [plates](./plates.md), [lever tiles](./lever-tiles.md), the
[pull feed](./pull-feed.md), and the [invoke panel](./invoke-panel.md).

## Read-only v1

v1 ships no invoke endpoint. The HTTP surface is exactly four routes:
`/` (the UI shell), `/ui/app.js` (the client), `/api/snapshot` (GET), and
`/api/stream` (SSE). There is nothing to POST to — read-only by absence,
not by policy check.

The GO-gate concept: the invoke panel exists in the UI (agent picker, prompt
box, PULL button) but the button is rendered disabled with the title
`GO-gated — v2`. Flipping it on in a later version means the box starts
issuing writes to agent gateways; v1 does neither.

## Relationship to fleet-bridge

cabinet-lite reuses
[fleet-bridge](https://github.com/leverframe/fleet-bridge)'s roster file
shapes directly — the same `agents.json` (OpenClaw) and `hermes-agents.json`
(Hermes) documents, plus an optional third generic-runtime roster. It does
not run fleet-bridge or depend on it at runtime; it only shares the file
format, so the same rosters feed both. Roster schemas are documented in
[configuration](./configuration.md).

## License

cabinet-lite is [MIT](https://github.com/leverframe/cabinet-lite/blob/main/LICENSE)-licensed.
