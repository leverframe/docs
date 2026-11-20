---
title: .curt emission
description: How wranglebot records supervised sessions in the .curt format
sidebar_position: 5
---

<!-- sources: src/curt/curt-emitter.ts, src/curt/mapper.ts, src/types.ts, src/daemon/cli.ts, package.json -->

# .curt emission

Every supervised tool call is buffered and written to a `.curt` file when the
session ends. WrangleBot is the first consumer of the
[.curt format](https://curtisai.tech/curt); serialization uses the
`curt-format` npm package (`serializeCurt`, `curtFilename`).

## The record

One record per supervised event (`CurtRecord` in `src/types.ts`):

```ts
export interface CurtRecord {
  sessionId: string;
  ts: number;
  tool: string;
  verdict: Verdict;
  reason?: string;
}
```

- `sessionId` — the UUID generated at session start (`randomUUID()` in
  `src/daemon/cli.ts`).
- `ts` — epoch milliseconds at event time.
- `tool` — the tool the agent invoked (e.g. `Edit`, `Bash`, `shell`,
  `mcp:<server>.<tool>`).
- `verdict` — the full `Verdict` object (`action` of `allow`/`warn`/`deny`/
  `rewrite`, optional `reason`, optional `updatedInput`).
- `reason` — duplicated from `verdict.reason` for convenience.

## The emitter

`CurtEmitter` (`src/curt/curt-emitter.ts`) buffers records for one session:

- `add(record)` — buffers a record; throws if the record's `sessionId` does
  not match the emitter's session.
- `size` — buffered record count.
- `flush(writePath)` — serializes the conversation with
  `serializeCurt(conversation, generator)` and writes it. If `writePath` is an
  existing directory or ends in a separator, the file is named by
  `curtFilename(conversation)` inside it; otherwise `writePath` is used
  verbatim. Missing parent directories are created. Returns the file written.

Constructor options (`CurtEmitterOptions`): `sessionId` (required), `title`
(defaults to `wranglebot <sessionId>`), `provider`, `model` (optional, set on
the conversation envelope only if provided), and `generator` (defaults to
`wranglebot 0.1.0`).

The conversation envelope is built from the buffered records: `id` is the
sessionId, `createdAt`/`updatedAt` are the min/max record timestamps, and each
record becomes one message.

## Record to message mapping

`recordToMessage` (`src/curt/mapper.ts`) maps each record to a `.curt` message
with `role: "tool"` per the spec:

- `id` — `<sessionId>_<ts>_<index>` (index is the record's position in the
  session).
- `content` — a JSON string of the payload:
  `{"tool": ..., "verdict": ..., "reason": ...}` (reason omitted when absent).
- Extension fields `tool`, `verdict`, `sessionId`, and `reason` are written as
  additional fields on the message. `.curt` readers ignore unknown fields but
  round-trip them verbatim, so tooling that understands wranglebot can read
  verdicts without parsing `content`.

## Where records land

In wrapper mode, `main` in `src/daemon/cli.ts` flushes to
`<workdir>/.wranglebot` at exit — so with the default filename scheme the
record lands at `<workdir>/.wranglebot/<curtFilename>.curt`. stderr prints
`wranglebot: curt written: <file>` on success. Emission is optional: if the
curt module cannot load, the CLI prints
`wranglebot: curt emission disabled: <reason>` and supervision continues
without records. A flush failure prints
`wranglebot: curt flush failed: <reason>` and does not change the exit code.
Nothing is written when zero records were buffered.
