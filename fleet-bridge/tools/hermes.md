---
title: Hermes tools
description: invoke_hermes and list_hermes_agents - SSH-invoked Hermes agents
sidebar_position: 9
---

<!-- sources: index.ts, hermes-agents.example.json -->

# Hermes tools

Hermes agents run on a different runtime than OpenClaw: the bridge invokes
them by SSHing to the agent's host and running the `hermes` CLI in one-shot
mode. Two tools cover them.

## list_hermes_agents

List Hermes agents reachable through this bridge.

### Arguments

None.

### Return value

A text content block containing JSON — the `hermes-agents.json` roster with
the `ssh_user` and `binary` fields stripped (they leak your infra layout to
anyone with client access). Remaining fields per entry: `name`, `role`,
`model`, `host`. `model` is display metadata; the bridge never reads it when
invoking.

### Example result

```json
[
  {
    "name": "scribe",
    "role": "Technical Writer",
    "model": "gemini-2.5-flash",
    "host": "127.0.0.1"
  }
]
```

Empty array = the Hermes roster failed to load or was never created.

## invoke_hermes

Send a one-shot prompt to a Hermes agent via SSH. Always stateless — the
Hermes CLI is invoked in one-shot mode (`-z`), which does not preserve
context across calls. There is no session support for Hermes agents.

### Arguments

| Argument | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Hermes agent name from `hermes-agents.json` |
| `prompt` | string | yes | User message to send |
| `timeout_ms` | number | no | Timeout in milliseconds. Default: `60000`, or the `FLEET_BRIDGE_INVOKE_TIMEOUT_MS` value. |

### Return value

A text content block containing the trimmed stdout of the remote `hermes`
process.

### Behavior details

The bridge spawns:

```text
ssh -o BatchMode=yes -o ConnectTimeout=10 {ssh_user}@{host} {binary} -z '<prompt>'
```

- **Auth**: key-based SSH must already work to the host — `BatchMode=yes`
  disables password prompts, so any password-authenticated host fails
  immediately.
- **Prompt quoting**: the prompt is wrapped in single quotes for the remote
  shell, with embedded single quotes escaped. The prompt arrives intact
  regardless of spaces or quote characters.
- **Timeout**: a kill timer SIGKILLs the ssh process at `timeout_ms` and the
  call fails with `timeout after {timeout_ms}ms invoking {name}`.
- **Exit codes**: exit 0 resolves with stdout; any non-zero exit rejects with
  `{name} exited {code}: {first 300 chars of stderr}`.
- **Connect failures**: ssh-level failures (bad host, no route, auth
  rejected) surface either as a non-zero exit with stderr, or as
  `ssh spawn failed: ...` if the `ssh` binary itself cannot be launched.
- **Progress notifications**: when the call carries `_meta.progressToken`,
  the bridge emits `notifications/progress` roughly every 500 characters of
  received stdout with messages like `Generated 1234 chars` and `total` set
  to `-1`.

### Example call

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"invoke_hermes","arguments":{"name":"scribe","prompt":"summarize the attached spec in one line"}}}
```

### Failure modes summary

| Error | Cause |
|---|---|
| `unknown hermes agent: {name}` | Name not in `hermes-agents.json`, or the roster failed to load |
| `timeout after ...ms invoking {name}` | Remote run exceeded the timeout; process killed |
| `{name} exited {code}: {stderr}` | Non-zero exit — Hermes error, bad binary path, or ssh/auth failure |
| `ssh spawn failed: {message}` | The `ssh` executable could not be started on the bridge host |
