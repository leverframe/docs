---
title: Self-hosting
description: Deploying cabinet-lite as a bare Node process — what the repo provides and what it does not.
sidebar_position: 9
---

<!-- sources: package.json, index.ts, server.ts, .github/workflows/ci.yml -->

## What the repo ships

The repo ships no deployment artifacts: no Dockerfile, no systemd unit, no
compose file. Deployment is a bare Node process, and this page documents
that honestly rather than inventing container definitions.

## Bare Node process

```bash
npm ci
npm run build
npm start          # node dist/index.js
```

Facts that matter for a deployment:

- The process listens on `127.0.0.1:9100` (or `PORT`). It will not accept
  external connections directly — put a reverse proxy in front if you need
  remote access, and note that no route authenticates.
- `index.ts` handles SIGINT and SIGTERM: both trigger `instance.stop()`
  (fleet poller and plate loop stop, SSE clients are destroyed, the HTTP
  server closes) and then exit 0. It shuts down cleanly under systemd.
- A bind failure (port taken) logs `cabinet-lite: <message>` and exits 1
  at startup.
- Runtime dependencies: none beyond Node built-ins. Node >= 24 required
  (`engines` in `package.json`).
- State: none on disk. Roster files and env vars are the only inputs; the
  feed is an in-memory ring buffer that resets on restart.

## Process supervision

Because there is no unit file in the repo, use your supervisor of choice.
A minimal systemd shape (adjust paths and environment to your host):

```ini
[Unit]
Description=cabinet-lite signal box
After=network-online.target

[Service]
WorkingDirectory=/opt/cabinet-lite
Environment=FLEET_BRIDGE_AGENTS=/etc/cabinet-lite/agents.json
Environment=FLEET_BRIDGE_HERMES=/etc/cabinet-lite/hermes.json
Environment=CABINET_URL=http://cabinet-internal:18900
Environment=FLEET_HEALTH_URL=http://fleet-health-internal:9150
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Run it as an unprivileged user. The rosters contain gateway tokens — keep
them outside the repo working tree and readable only by the service user.

## Docker

Not provided by the repo. Nothing in the code prevents containerizing it
(static build output in `dist/`, static UI in `ui/`, loopback bind —
remember a container would need the proxy or a port mapping, and the
hardcoded `127.0.0.1` bind means `EXPOSE` alone will not publish it).
Any Dockerfile you add is your own.

## CI

GitHub Actions builds and tests on every push/PR to `main`
(`.github/workflows/ci.yml`): Node 24, `npm ci`, `npm run build`,
`npm test`. Green CI is the deploy gate the repo itself defines.

## Resource profile

The box polls every roster entry every 10 s (5 s timeout per probe, 250 ms
stagger) plus two plate URLs every 30 s, and holds one ring buffer of up
to 500 feed entries. Memory and CPU scale linearly with roster size and
stay small for typical fleets. Each browser client holds one SSE
connection open.
