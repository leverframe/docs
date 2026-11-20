---
title: CLI reference
description: Every wranglebot command, flag, and binary
sidebar_position: 10
---

<!-- sources: bin/wranglebot.mjs, bin/wranglebot-hook.mjs, src/daemon/cli.ts, package.json, README.md -->

# CLI reference

`@wranglebot/cli` installs two binaries (`bin` field in `package.json`):

| Binary | Entry | Purpose |
| ------ | ----- | ------- |
| `wranglebot` | `bin/wranglebot.mjs` | Supervisor CLI |
| `wranglebot-hook` | `bin/wranglebot-hook.mjs` | Claude Code PreToolUse hook |

## wranglebot

```text
usage: wranglebot run <claude-code|codex> [PROMPT...] [--workdir DIR] [--scope PATH]...
```

The usage string is literal, from `src/daemon/cli.ts`.

### Subcommands

| Subcommand | Description |
| ---------- | ----------- |
| `run` | The only subcommand. Spawns the agent under supervision. |

### Positional arguments

| Argument | Required | Description |
| -------- | -------- | ----------- |
| agent | yes | Exactly `claude-code` or `codex`. Any other value is rejected. |
| prompt | yes | One or more positional words, joined with single spaces into the prompt. Must be non-empty. |

### Flags

| Flag | Repeatable | Description |
| ---- | ---------- | ----------- |
| `--workdir DIR` | no (last wins) | Project root: containment root for `scope-guard`, deletion-path root for `ast-gate`, `cwd` for the spawned agent, and flush directory for `.curt` output. Defaults to `process.cwd()`. |
| `--scope PATH` | yes | Additional allowed write root handed to `scope-guard` as `allowedPaths`. An entry covering a path also overrides the default denied patterns for that path. |

Any other flag beginning with `--` is an unknown-flag error. A flag value that
is missing or starts with `--` is rejected. All argument errors exit `1` with
`wranglebot: <message>` plus the usage line on stderr.

There are no other flags in v0.1.1: no `--help`, no `--version`, no config
file, no environment variables for the CLI itself. (`CODEX_PATH` is consumed
by the Codex observer's spawn wrapper, not by argument parsing.)

### Environment variables

| Variable | Used by | Description |
| -------- | ------- | ----------- |
| `CODEX_PATH` | Codex observer | Path to the codex binary; default `codex`. |

### Runtime output

All diagnostics go to stderr, each line prefixed `wranglebot: `:

- `wranglebot session <uuid> agent=<agent> guardrails=[<names>]` — session
  start
- `wranglebot: <tool> -> <action> (<reason>)` — one line per supervised event
- `wranglebot: curt written: <file>` — flush success
- `wranglebot: curt emission disabled: <reason>` / `curt flush failed: <reason>`
- `wranglebot: skipped <module>: <reason>` — a guardrail module failed to load

## wranglebot-hook

Reads the Claude Code hook input JSON from stdin and writes the decision JSON
to stdout. Takes no flags. Behavior and exit codes:
[Hooks](../hooks.md). Gated tools: `Edit`, `Write`, `MultiEdit`; guardrail:
ast-gate only, with `workdir` from the hook input's `cwd` field.

Exit codes: `0` decision written; `2` stdin unreadable or invalid JSON
(blocking error per the hook contract).

## Exit codes

See [Exit codes](./exit-codes.md): `0` clean, `1` setup/supervision error,
`2` agent denied.
