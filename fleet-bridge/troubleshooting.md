---
title: Troubleshooting
description: Timeout behavior, roster failures, token stripping, and other failure modes
sidebar_position: 13
---

<!-- sources: index.ts, README.md, docs/QUICKSTART.md, docs/CONFIG.md -->

# Troubleshooting

## `unknown agent: {name}` (or `unknown hermes agent: {name}`)

The roster did not load. The bridge silently falls back to an empty roster
when the file is missing or unparseable and keeps running, so every invoke
fails this way until a valid file is supplied. Check:

1. The path your env var (or the default `<repoRoot>/agents.json` /
   `<repoRoot>/hermes-agents.json`) points at — the default resolves relative
   to the built `dist/` output, i.e. the repo root.
2. The JSON parses (`node -e "JSON.parse(require('fs').readFileSync('agents.json'))"`).
3. The file has the `{"agents": [...]}` wrapper — a bare top-level array
   parses fine but yields an empty roster.

Note: the smoke test in [Getting started](./getting-started.md) prints the
list result — run `list_agents` / `list_hermes_agents` first to confirm what
the bridge actually loaded.

## Bad roster fields fail late, not at load

The loader does no runtime validation — a missing `port`, `token`, or
`binary` sails through startup and only errors (or fails silently) when you
invoke that agent. Validate your roster by hand before the first invoke.

Duplicate `name` values: first match wins; the duplicate is unreachable and
produces no warning.

## Timeouts and turn cancellation

- `invoke_agent` and `invoke_hermes` default to a **60000 ms** ceiling
  (`FLEET_BRIDGE_INVOKE_TIMEOUT_MS`), overridable per call via `timeout_ms`.
  On timeout the call errors (`This operation was aborted` for OpenClaw;
  `timeout after {ms}ms invoking {name}` for Hermes) and the partial reply is
  lost — there is no resume.
- `agent_health` is bounded by `FLEET_BRIDGE_HEALTH_TIMEOUT_MS` (default
  **5000 ms**), no retry.
- Non-numeric or non-positive values for either env var fall back silently
  to the defaults — a typo like `FLEET_BRIDGE_INVOKE_TIMEOUT_MS=60_000`
  behaves as if unset.
- Your **MCP client may have its own, lower call timeout**. Raising the
  bridge's timeout does not help if the client cancels first. Give slow
  agents a larger per-call `timeout_ms` rather than raising the global
  default, and check the client's own budget.
- Hermes SSH connections additionally use `ConnectTimeout=10` (10 s to
  establish TCP/SSH); a slow-to-connect host fails faster than the invoke
  timeout.

## Connection refused / HTTP errors on OpenClaw agents

- Wrong `host`/`port`, or the agent's gateway service is down. Check the
  port in the agent's OpenClaw config and that its service is running.
- `HTTP 401/403` from the gateway = stale or wrong `token` in the roster.
  Rotate the token in the agent's config, regenerate the roster
  (`scripts/build-agents.json.sh`), and restart the bridge.
- Agent-side faults usually show in `journalctl` on the agent host (OpenClaw
  runs as systemd units).

## Hermes invoke failures

- `BatchMode=yes` means **no password prompts** — a host that needs password
  auth fails immediately. Key-based SSH must already work from the box
  running the bridge.
- `{name} exited {code}: ...` with connection errors = wrong `host`,
  unreachable host, or rejected key. With exit code 127-style messages =
  wrong `binary` path on the remote host.
- `ssh spawn failed: ...` = the `ssh` executable itself is missing or failed
  to launch on the bridge host.

## Token stripping

Credentials never appear in tool output:

- `list_agents` strips the `token` field from every entry (all other fields,
  including `model`, are returned).
- `list_hermes_agents` strips `ssh_user` and `binary`; `name`, `role`,
  `model`, `host` are returned.
- No other tool echoes roster fields. Invoke results contain only the
  agent's reply text.

If you think you are seeing a token in output, you are not — check the
roster field names; the stripped-list shapes are the contract.

If a secret *does* leak outside tool output (e.g. you pasted a real token
into an example file or issue), rotate it: change the gateway token, rebuild
the roster, redeploy, restart.

## Plain HTTP by design

The bridge speaks unencrypted `http://` to agent gateways and plain SSH to
Hermes hosts. Run it on a network you trust (loopback, LAN, or a private
overlay); do not expose agent gateways to the public internet. There is no
TLS option in v0.1.

## Roster hygiene

- Keep roster files `chmod 600`. They are gitignored by default; if you
  relocate them via env vars, keep them out of any synced or backed-up tree
  you do not control.
- Rosters load once at startup — after any roster edit, restart the bridge
  (or your MCP client, which restarts the bridge).
- OpenClaw agents: to add or rotate an agent, change its OpenClaw config,
  re-run `scripts/build-agents.json.sh`, redeploy the roster, restart.
