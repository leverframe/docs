---
slug: /
title: Introduction
sidebar_position: 1
description: What Tractum is, why it exists, and the receipt model.
---

<!-- sources: README.md, pyproject.toml, tractum/__init__.py, tractum/signing.py, tractum/swarm.py -->

# Introduction

Tractum is a Python package (Python 3.11+) for **verifiable multi-agent consensus**. A swarm of specialist agents answers a question; the answers are aggregated through a consensus strategy; and the result ships as a **k-of-n signed receipt** — each agent signs its own stance, the operator signs the aggregate, and anyone can verify the artifact forever, without running Tractum.

Frameworks coordinate. Tractum agrees.

## The problem

Every agent framework can make one agent answer. Most can run several in parallel. What none of them produce is a **per-agent signed, quorum-verifiable artifact** you can hand to an auditor, a regulator, or a future teammate. Coordination output is text; text has no provenance.

## The receipt concept

A `ConsensusReceipt` is the core artifact:

1. Each agent in a swarm holds a signing keypair (pinned via `AgentConfig.signing_key`, or provisioned ephemerally per swarm). As each agent answers, it **signs its own stance** — answer, confidence, model, role, task id — producing a signed statement.
2. The swarm's responses are aggregated by a `ConsensusStrategy` (`WeightedVote` by default, `Debate` for hard questions). Disagreement is surfaced in the result (`agreement`, `disagreed`), not averaged away.
3. `ConsensusReceipt.from_result(...)` packs the result plus every per-agent statement into a canonical JSON payload with a quorum threshold `k` baked in. The operator signs the payload; the signature covers the agent signatures too.
4. The signed receipt renders over three transports: plain JSON, a W3C Verifiable Credential envelope, or a Nostr kind-30078 (NIP-78) event signed with BIP-340 Schnorr — publishable to any Nostr relay.

Because the quorum threshold is part of the signed payload, it cannot be downgraded post-hoc. Because each statement is individually signed, a verifier counts valid agent signatures against `k` instead of trusting the operator's word. This is what makes a v2 receipt a k-of-n attestation rather than one operator's claim.

## What ships in the package

- `Swarm` / `SwarmConfig` / `Task` — concurrent agent collection and consensus execution
- `WeightedVote` and `Debate` consensus strategies, plus the `ConsensusStrategy` extension point
- `ConsensusReceipt`, `SignatureBackend`, `Ed25519Backend` (default), `MLDSABackend` (ML-DSA-65 post-quantum, opt-in)
- `verify_receipt_detailed` — full verification report: aggregate signature, per-statement signatures, key pinning, quorum count
- Transports: JSON receipt, W3C VC, Nostr NIP-78 event (`tractum.transports`)
- An RFC 6962-style append-only transparency log anchored to Nostr (`tractum.transparency`)
- An MCP server (`tractum-mcp`) exposing `reach_consensus` and `verify_consensus` tools
- Adapters for LangGraph, Microsoft Agent Framework, and CrewAI
- `Coordinator` — hierarchical task decomposition with dependency-respecting parallel execution

## License

Tractum is licensed under the **Business Source License 1.1 (BUSL-1.1)** — source-available, not open source. The license converts to MIT on 2030-10-12. See the `LICENSE` file in the repository.

## Where to go next

- [Quickstart](./quickstart.md) — install and run a signed consensus in under 2 minutes
- [Consensus model](./concepts/consensus.md) — how stances are collected and what k-of-n means here
- [Receipts](./concepts/receipts.md) — receipt anatomy, signing, and Nostr publication
- [API reference](./api/index.md) — the public surface
- [Verification](./verification.md) — verify a receipt without running Tractum
