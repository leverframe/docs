---
title: Lever tiles
description: Tile states, runtime tags, the lever-throw animation, and hover behavior.
sidebar_position: 5
---

<!-- sources: ui/app.js, ui/index.html, fleet.ts -->

Lever tiles are the "who's free" surface: one tile per roster entry, laid
out in an auto-fill grid (`minmax(112px, 1fr)`). Each tile shows the agent
name, its role, a lever slot graphic, and a runtime tag.

## State dots

The state dot in the tile's top-right corner is driven by the health cache:

| State | Dot | When |
|---|---|---|
| `live` | solid green (`#00C853`) | health result has no `error` and `ok` is true |
| `down` | red (`#E5484D`) plus a red-tinted tile border | health result carries an `error` (probe failed, timed out, non-JSON) |
| `idle` | gray, 40 percent opacity | no health result yet, or the entry is not health-displayed (see below) |

Health semantics come from `fleet.ts`: each OpenClaw and generic entry is
polled with HTTP GET at its `healthPath` (default `/health`), 5 s timeout,
and the JSON body is used as-is — a probe is `live` when the response is
JSON with `ok: true`.

Probed slices are OpenClaw + generic. Hermes entries always render `idle`:
`fleet.ts` reports them as static `"ssh"` status in v1 (no HTTP probe
exists for Hermes). Entries labeled `mcp` are probed server-side, but their
health is deliberately not displayed — they render static `idle` too.

Before the first poll completes, every probed tile is `idle`.

## Runtime tags

The small tag in the tile's bottom-right corner is the runtime label,
lowercased and truncated to 2 characters: `oc` for openclaw, `he` for
hermes, `mcp` for mcp. Labels come from each roster entry's `runtime`
field, defaulting by roster kind (`openclaw` for OpenClaw/generic entries,
`hermes` for Hermes entries). A generic entry with `runtime: "khoj"`
renders the tag `ko`.

## Lever-throw animation

Each tile contains the lever slot graphic: a steel lever arm in a dark
slot, with a ball riding it.

- Normal tiles render the arm static (bright steel for `live`, dark steel
  otherwise).
- The `busy` tile class is armed for v2: it would turn the arm amber
  (`#FFB000`) and run the throw animation — a 2.2 s cubic-bezier loop that
  pivots the lever through the slot (width 12 percent to 82 percent and
  back) while the ball rides it. In v1, no renderer ever assigns `busy`,
  so the animation is dormant. "Busy = animated" is the v2 contract: a
  lever being pulled is a lever in motion.

## Hover behavior

Hovering a tile brightens its border from `#1F1F1F` to `#C2C7CC`. The v2
`busy` class would brighten to amber on hover. Tiles have no click
handlers in v1.

## Empty roster

With no entries at all, the tile grid renders a single line:
"no levers in the frame — roster empty."
