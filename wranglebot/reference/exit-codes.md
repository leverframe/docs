---
title: Exit codes
description: Exit codes and failure taxonomy
sidebar_position: 9
---

<!-- sources: src/daemon/cli.ts, src/observers/codex.ts, bin/wranglebot.mjs -->

# Exit codes

`main()` in `src/daemon/cli.ts` returns the process exit code (consumed by
`bin/wranglebot.mjs` as `process.exitCode`). Final return:
`return denied ? 2 : (code ?? 1)`.

| Code | Meaning | Produced by |
| ---- | ------- | ----------- |
| `0` | Agent finished clean; no deny verdict was issued and the agent itself exited `0`. | Clean Claude Code run |
| `1` | Setup or supervision error. | See taxonomy below |
| `2` | The agent was denied — a loop-breaker kill or a guardrail deny fired. `denied` is set on the first `deny` verdict, the agent process is killed immediately, and the code wins over any other outcome. | Any guardrail returning `deny` |

`warn` verdicts never change the exit code.

## Failure taxonomy for exit `1`

In order of occurrence:

1. **Argument errors** (`parseArgs` throwing `CliError`):
   - unknown command (anything but `run`)
   - unknown or missing agent (must be `claude-code` or `codex`)
   - unknown flag (any `--flag` other than `--workdir`/`--scope`)
   - `--workdir` or `--scope` missing its value (or the value itself starts
     with `--`)
   - empty prompt (no positional arguments)
   Each prints `wranglebot: <message>` plus the usage line to stderr.
2. **Claude Code spawn failure**: the child emits an `error` event; stderr
   prints `wranglebot: claude spawn failed: <message>`. The child's exit code
   is then null, which the final expression maps to `1`.
3. **Claude Code agent failure**: the `claude` process itself exits non-zero;
   that non-zero code is passed through. (Any non-zero agent exit therefore
   propagates as a non-zero wranglebot exit even without a deny.)
4. **Codex supervision errors** (wrapped in the try around `observer.run`):
   - spawn failure: `failed to spawn codex ("<path>"): <message>`
   - non-zero codex exit, including Windows code `9009` for a missing binary:
     `codex ("<path>") exited with code <n>`
   - no stdout stream: `codex ("<path>") produced no stdout stream`
   Any of these prints to stderr and sets the run code to `1`.

Note the precedence: a deny always maps to `2` regardless of the agent's own
exit code, but a codex error path exits `1` before any deny can be recorded
after that point.

## Exit codes outside the CLI

`bin/wranglebot.mjs` propagates `main()`'s return as `process.exitCode`.

`bin/wranglebot-hook.mjs` (hook mode) follows the Claude Code hook contract:
`0` success, `2` blocking error (stdin unreadable or invalid hook JSON), any
other code non-blocking. See [Hooks](../hooks.md#exit-codes).

## What exit `2` does not mean

Exit `2` is not the agent's own refusal to run a tool with a warning — warns
are recorded and printed but do not deny. It is specifically the deterministic
kill/deny path: identical-call threshold reached, failure-signature threshold
reached, ast-gate deny rule matched, or scope-guard containment/denied-pattern
match.
