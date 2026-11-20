---
title: Examples
sidebar_position: 6
description: Runnable demos in the repository's examples/ directory and what each one shows.
---

<!-- sources: examples/quickstart.py, examples/consensus_demo.py, examples/coordinator_demo.py, examples/mcp_demo.py, examples/buzz_consensus_demo.py, examples/buzz_wire_publish.py, examples/buzz_wire_event_v030.json, examples/transparency_demo.py, examples/langgraph_adapter_demo.py, examples/maf_adapter_demo.py, examples/crewai_adapter_demo.py, examples/killer_demo.py, README.md -->

# Examples

All snippets below are from the repository's `examples/` directory. Clone the repo to run them:

```bash
git clone https://github.com/JordanNewell/tractum
cd tractum
```

## Minimal swarm + signed receipt

`examples/quickstart.py` — the smallest useful program. A 3-agent swarm (DBA, Indie Hacker, Security Engineer) picks a database for a side project; the result is rebuilt from its dict form, packed into a receipt via `ConsensusReceipt.from_result`, and signed with `Ed25519Backend`. Uses `TRACTUM_SIGNING_KEY` when set, otherwise a fresh ephemeral key.

```bash
pip install tractum
export ANTHROPIC_API_KEY=sk-ant-...
python examples/quickstart.py
```

## Disagreement surfaced, then resolved

`examples/consensus_demo.py` — three specialists (StrongConsistency, Operations, Pragmatist) disagree on a multi-region backend architecture. The demo runs `WeightedVote` first to surface the disagreement, then re-runs `Debate` so agents see each other's reasoning and converge, and signs the final result. Shows `to_json_receipt` output.

```bash
python examples/consensus_demo.py
```

## Hierarchical decomposition

`examples/coordinator_demo.py` — a `Coordinator` breaks a complex task into a real JSON plan, routes each sub-task to a specialist (`Researcher`, `Analyst`, `Writer`) by role match, runs independent sub-tasks in parallel, and synthesizes the result. Requires `ANTHROPIC_API_KEY`.

```bash
python examples/coordinator_demo.py
```

## MCP end-to-end, keyless

`examples/mcp_demo.py` — the launch story in one script: a 3-agent swarm reaches a decision, the receipt is produced exactly the way `tractum-mcp` produces it, then verified — aggregate signature, quorum k-of-n, every agent statement — through the server's own `verify_consensus` tool. Runs keyless (offline stub agents, no API key) when the `mcp` extra is not installed; with `tractum[mcp]` the verification goes through the real MCP tool call.

```bash
python examples/mcp_demo.py                # keyless, offline stubs
ANTHROPIC_API_KEY=sk-ant-... python examples/mcp_demo.py   # live agents
```

## Nostr round-trip (Buzz interop)

`examples/buzz_consensus_demo.py` — three advisors (Operator, Investor, CFO) reach a weighted-vote decision; the signed receipt is wrapped as a Nostr kind-30078 event via `to_nostr_event`, published to a relay, and a subscriber reads it back and verifies the consensus signature in one line. Offline mode needs no API key. Requires `pip install tractum[nostr] websockets` and a local relay:

```bash
nak serve --port 10547                     # terminal 1
python examples/buzz_consensus_demo.py     # terminal 2 (offline mode)
```

The relay URL defaults to `ws://localhost:10547`, overridable with `TRACTUM_DEMO_RELAY`.

## Wire publish

`examples/buzz_wire_publish.py` — one-shot publisher: generates a fresh Nostr keypair, runs a real `Debate` consensus on a Buzz-relevant question with three agents (ProtocolArchitect, AgentFrameworkLead, AcquiHireBuyer), signs the receipt, publishes to a list of public relays, and prints a `https://nostr.mom/e/{event_id}` viewer URL. Requires `ANTHROPIC_API_KEY`.

The repository also ships `examples/buzz_wire_event_v030.json` — the actual kind-30078 event (event id `3974ebfe688f1639a8534b46bbbfeddf354d18efcd190352da877756d1bac60b`) produced by that script at v0.3.0, suitable for `nak verify` against the relays it was published to.

## Transparency log

`examples/transparency_demo.py` — three swarms reach (simulated) consensus; each receipt is appended to a `TransparencyLog`; the log root is published as a Nostr anchor event; then a receipt is verified against the published root with only the receipt + inclusion proof + root — no trust in the log operator. Runs fully offline (no API key); the Nostr anchor leg uses `tractum[nostr]`.

```bash
python examples/transparency_demo.py
```

## Framework adapters

Each demo shows the prebuilt path and the embed-in-your-graph path:

- `examples/langgraph_adapter_demo.py` — consensus as a `StateGraph` node (`build_consensus_graph` standalone, or `make_consensus_node` added to your own graph after an upstream research node). Requires `langgraph` and `ANTHROPIC_API_KEY`.
- `examples/maf_adapter_demo.py` — consensus as a Microsoft Agent Framework executor (`build_consensus_workflow` standalone, or `make_consensus_executor` wired after an upstream research executor). Requires `tractum[maf]`.
- `examples/crewai_adapter_demo.py` — consensus callable from a CrewAI crew: `reach_consensus(swarm)` as a `@tool` the agent invokes, plus the prebuilt `ConsensusFlow`. Requires `tractum[crewai]`.

## Killer benchmark

`examples/killer_demo.py` — the same hard question answered three ways: a single Claude call, a CrewAI crew, and a Tractum swarm. Captures latency, token counts, and a blind LLM-judge score (correctness, nuance, completeness, disagreement-surfaced); writes `examples/killer_demo_results.md`. Requires `pip install -e ".[nostr,dev,benchmark]"` (litellm optional for token tracking). Reproducible from cold via the Docker appliance — see [Self-hosting](./self-hosting.md).
