---
title: Supervision pipeline
description: The daemon module — CLI entry, session, pipeline, registry, agent streams
sidebar_position: 6
---

<!-- sources: src/daemon/cli.ts, src/daemon/session.ts, src/daemon/pipeline.ts, src/daemon/registry.ts, src/daemon/claude-stream.ts, src/types.ts -->

# Supervision pipeline (`src/daemon/`)

The daemon module is the supervision engine behind `wranglebot run`. There is
no long-running background process: one supervised session lives exactly as
long as one agent run.

## Components

| File | Role |
| ---- | ---- |
| `cli.ts` | Argument parsing (`parseArgs`) and the `main()` orchestration loop behind `bin/wranglebot.mjs`. |
| `session.ts` | `SupervisorSession` — runs events through guardrails. |
| `pipeline.ts` | `createPipeline` — builds a `SupervisorSession` with a fresh session id. |
| `registry.ts` | `loadGuardrails` — discovers and instantiates guardrails. |
| `claude-stream.ts` | `runClaudeStream` — spawns Claude Code and parses its stream-json. |

## Lifecycle of one run

1. **Parse** — `parseArgs` validates `run`, the agent kind, and flags. Errors
   print to stderr and exit `1`.
2. **Provision** — a session UUID is generated via `randomUUID()`;
   `loadGuardrails({ workdir, scope })` loads the guardrail modules (see
   [Guardrails — order of evaluation](./guardrails.md#order-of-evaluation)).
   A missing or broken guardrail module is skipped with a stderr warning,
   never fatal. The `CurtEmitter` is loaded lazily; failure disables emission
   with a warning.
3. **Stream** — the agent is spawned and its event stream is parsed into
   `AgentEvent`s (`ts`, `source`, `sessionId`, `tool`, `input`, optional
   `output`). Claude Code via `claude-stream.ts`, codex via the
   [observer](./observers.md).
4. **Handle** — for each event, `SupervisorSession.handle` returns the winning
   verdict; the CLI prints `wranglebot: <tool> -> <action> (<reason>)` to
   stderr and buffers a `CurtRecord`.
5. **Enforce** — on the first `deny` verdict, `denied` is set and
   `killAgent()` runs: `child.kill()` for Claude Code, `observer.stop()` for
   codex.
6. **Flush and exit** — buffered records are flushed to
   `<workdir>/.wranglebot`; the exit code is `2` if denied, otherwise the
   agent's exit code (`1` if null). See
   [Exit codes](./reference/exit-codes.md).

## SupervisorSession semantics

`handle(event)` (`src/daemon/session.ts`):

```ts
let verdict = ALLOW;
for (const g of this.guardrails) {
  const v = g.inspect(event);
  if (v && (v.action === "deny" || v.action === "rewrite")) {
    verdict = v;
    break;
  }
}
for (const g of this.guardrails) g.observe(event);
return verdict;
```

- `inspect()` runs in registration order; the first `deny` or `rewrite` wins
  and stops the chain. A plain `warn` never short-circuits and is superseded
  by any later deny.
- `observe()` runs on every guardrail regardless of outcome — this is what
  keeps loop-breaker counters accurate even when another guardrail denied
  first.
- Every handled event is appended to `session.events`; `guardrailNames`
  exposes the loaded set for diagnostics.

## Claude Code stream

`runClaudeStream` (`src/daemon/claude-stream.ts`) spawns:

```bash
claude -p <prompt> --output-format stream-json --verbose
```

with `cwd` set to the workdir and stdin ignored. (Print mode with
`stream-json` requires `--verbose` — see the `claudeArgs` comment.) NDJSON
lines are parsed by `parseStreamLine`: only assistant messages containing
`tool_use` content blocks become events; every other line type is ignored.
Malformed JSON lines yield no events.

## Pipeline construction

`createPipeline({ sources, guardrails })` validates both arrays and returns a
`SupervisorSession` with its own generated session id. In wrapper mode the
CLI passes `sources: [agent]` and the loaded guardrail list.
