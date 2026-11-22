---
title: Pull feed
description: Feed entries, runtime provenance badges, error entries, and the while-you-were-away digest.
sidebar_position: 6
---

<!-- sources: feed.ts, server.ts, ui/app.js, docs/CONFIG.md -->

## Feed entries

The feed is the "what happened" journal. Each entry (`FeedEntry` in
`feed.ts`) carries:

| Field | Meaning |
|---|---|
| `ts` | timestamp, stamped by the server at insertion |
| `runtime` | provenance label — `openclaw` / `hermes` / `mcp` today, any roster label in general |
| `agent` | agent name |
| `summary` | one-line description |
| `ms` | latency in milliseconds (`0` renders as an em dash) |
| `ok` | success flag |

Storage is an in-memory ring buffer capped at 500 entries, newest first.
Restarts reset the feed — it is a journal, not a store.

**What lands in the feed in v1:** health transitions. When any HTTP-probeable
agent (OpenClaw or generic) flips between live and down, `server.ts` adds
one entry: summary `health recovered` (`ok: true`) or
`health degraded: \<error\>` (`ok: false`), with `ms: 0`. The first poll
seeds the health cache without emitting entries. The feed surface is the
same one v2 lever pulls will land in, which is why every entry already
carries runtime provenance.

## Runtime provenance badges

Each row renders a badge after the agent name:

| Label | Badge style |
|---|---|
| `openclaw` | amber (`b-oc`) |
| `hermes` | steel (`b-he`) |
| `mcp` | muted gray (`b-mcp`) |
| anything else | generic steel badge (`b-x`) with the label uppercased — e.g. a generic roster entry labeled `khoj` renders `KHOJ` |

The RUNTIMES side-rail in the sidebar counts every distinct label across
the roster plus any label seen in feed traffic (max 6 rows, then a
`+N more` line).

## Error entries

Failed entries (`ok: false`) get a dark red-tinted row background, the
summary text in red, and a `context →` link stub on the right. In v1 the
stub is not wired to anything — it marks where failure context will open.

## While you were away

Two digest behaviors, both computed client-side in `ui/app.js`:

- **Session digest.** On load, the client records the session start time.
  If any feed entries newer than that are failures, a dashed-border
  digest box appears above the feed: "while you were away — N failures
  since you opened this box." Zero failures keeps it hidden. It counts
  the whole live session, not just reconnections.
- **Top-line digest.** The header line computes, since local ET midnight:
  total pulls, failures, and escalations — an escalation is a failed entry
  whose summary matches `needs_human` or `escalat` (case-insensitive).
  Rendered as "since 00:00 — N pulls · N failures · N escalations".

Feed rows also feed the PULL RHYTHM strip: 48 half-hour buckets covering
24 h; bar height is relative to the busiest bucket, and any bucket
containing a failure renders amber.

Empty feed renders: "no pulls yet — the box is quiet."
