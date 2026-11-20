---
title: Loop-breaking
description: Deterministic kill signals, thresholds, and what counts as thrashing
sidebar_position: 4
---

<!-- sources: src/loopbreak/loop-breaker.ts, src/daemon/session.ts, src/types.ts, README.md -->

# Loop-breaking

Source: `src/loopbreak/loop-breaker.ts`. The `LoopBreaker` guardrail detects
agent stuck-loops deterministically — no heuristics, no LLM judgment. All
state is per `sessionId`; `reset()` clears one session or everything.

Contract: `inspect()` reads state (and counts the incoming attempt) before the
tool executes; `observe()` updates state from `event.output` after it runs.

## Detector 1 — identical (tool, input) fingerprint

Every event is fingerprinted as `sha256("<tool> " + canonicalJson(input))`
(`fingerprint()`). `canonicalJson` serializes deterministically: object keys
sorted, `undefined` values dropped, `bigint` coerced to string. Two calls
count as identical only when the tool name and the full canonicalized input
match byte-for-byte.

The Nth identical attempt:

| Attempts | Verdict | Reason |
| -------- | ------- | ------ |
| reaches `identicalWarnThreshold` (default 3) | `warn` | `loop-breaker: identical <tool> call attempted N times (warn threshold 3)` |
| reaches `identicalDenyThreshold` (default 5) | `deny` | `loop-breaker: kill — identical <tool> call attempted N times (deny threshold 5)` |

The deny check runs first, so attempts 3–4 warn and attempt 5 kills.

## Detector 2 — repeated identical test failure

`failureSignature(output)` extracts output text (`output`, `stdout`,
`aggregated_output`, `text`, `stderr`, `result` — first string field found),
classifies it as a failure (a `status` field matching /fail/i, a non-zero
`exit_code`, or text containing `failed`/`failure`/`panic`/`fatal`, a leading
`error`, or the ✗/✘ marks), then hashes the failing lines: lines matching
/fail|error|panic|assert/ or the failure marks are normalized (whitespace
collapsed, digits masked to `#` so changing counts do not defeat matching)
and sha256'd. Non-failure output yields null and is not counted.

When the same signature has been seen `failureDenyThreshold` (default 4)
times, the verdict is:

```text
deny — loop-breaker: kill — same failure signature seen N times (deny threshold 4)
```

The count increments in `observe()`; `inspect()` denies when the incoming
event would push the count to the threshold.

## Detector 3 — no-progress shell streak

Shell tools (`SHELL_TOOLS`, matched case-insensitively): `shell`, `bash`,
`sh`, `exec`. For these, `observe()` compares the extracted output text to the
previous shell output. Byte-identical output increments `noProgressStreak`;
any different output resets the streak to 1. Any non-shell event resets the
streak to 0 — non-shell activity counts as progress.

When the streak has already reached `noProgressWarnThreshold` (default 3) at
inspect time:

```text
warn — loop-breaker: no progress — N consecutive identical shell outputs
```

This detector only warns; it never denies.

## Configuration

All thresholds are constructor options (`LoopBreakerOptions`):

| Option | Default | Effect |
| ------ | ------- | ------ |
| `identicalWarnThreshold` | 3 | Identical-call attempts before warn |
| `identicalDenyThreshold` | 5 | Identical-call attempts before deny/kill |
| `noProgressWarnThreshold` | 3 | Consecutive identical shell outputs before warn |
| `failureDenyThreshold` | 4 | Repeats of the same failure signature before deny |

## What a kill means

In wrapper mode (`wranglebot run`), the deny verdict sets `denied = true` and
the supervisor calls `killAgent()` — `child.kill()` for a Claude Code child
process, `observer.stop()` for codex (`src/daemon/cli.ts`). The run then
exits with code `2`. See [Exit codes](./reference/exit-codes.md).
