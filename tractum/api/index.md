---
title: API Reference
sidebar_position: 5
description: The public tractum surface — classes, functions, signatures, and parameters.
---

<!-- sources: tractum/__init__.py, tractum/swarm.py, tractum/agent.py, tractum/consensus.py, tractum/coordinator.py, tractum/runtime.py, tractum/signing.py, tractum/signing_pq.py, tractum/transports.py, tractum/transparency.py, tractum/server.py, tractum/curt_link.py, tractum/events.py, tractum/adapters/langgraph.py, tractum/adapters/maf.py, tractum/adapters/crewai.py -->

# API Reference

Everything below is exported from the `tractum` top-level package (`from tractum import ...`) unless noted as module-level. Version: 0.5.0, Python 3.11+.

## Core execution

### `Swarm(config, api_key=None, consensus=None, on_event=None, statement_backend=None)`

Concurrent multi-agent consensus runner.

- `config: SwarmConfig` — swarm definition.
- `api_key: str | None` — Anthropic API key passed to each `Agent`.
- `consensus: ConsensusStrategy | None` — strategy override; defaults to the `SwarmConfig.consensus_method` hint.
- `on_event: OnEvent | None` — async observer receiving `AgentCompleted` and `ConsensusResolved` events.
- `statement_backend: SignatureBackend | None` — backend used to sign per-agent statements; defaults to `Ed25519Backend`.

Methods: `await process(task: Task) -> Task` (collects responses, runs consensus, sets `task.result` to the `ConsensusResult.to_dict()` form), `get_state() -> dict`. Attributes: `agents`, `task_history`, `consensus`.

### `SwarmConfig(name, description, agents=[], topology="hierarchical_mesh", consensus_method="weighted_vote", max_task_tokens=100_000)`

Dataclass. `consensus_method` is a back-compat hint (`"weighted_vote"` or `"debate"`) overridden by an injected strategy. `max_task_tokens` is a safety cap across consensus rounds.

### `Task(id, description, input_data, status="pending", result=None, created_at=<utcnow>)`

Dataclass. A unit of work for a swarm.

### `AgentResponse(agent_name, answer="", content="", confidence=0.5, reasoning="", round=1, timestamp=<utcnow>, statement=None)`

Dataclass. One agent's parsed response; `statement` is the signed stance dict (None when unsigned).

### `Agent(config, api_key=None)`

Single Claude agent wrapping `AsyncAnthropic` with an automatic tool-use loop. Methods: `await think(input_message: str) -> str`, `reset()`, `get_state() -> dict`.

### `AgentConfig(name, role, instructions, model="claude-3-5-sonnet-20241022", temperature=0.7, max_tokens=4096, tools=[], signing_key="")`

Dataclass. `signing_key` is the hex private key the agent signs its consensus statements with; empty means the swarm provisions an ephemeral key per swarm.

### `Message(role, content, timestamp=<utcnow>, tool_calls=[], tool_results=[])`

Dataclass. One message in an agent conversation; `to_api_format()` converts to Anthropic API shape.

## Consensus strategies

### `ConsensusStrategy` (ABC)

Subclass and implement `await resolve(responses: list[AgentResponse], swarm: Swarm) -> ConsensusResult`.

### `WeightedVote`

`name = "weighted_vote"`. One round; winner is the highest-confidence response. `disagreed` when agreement < 0.6 or winner confidence < 0.6.

### `Debate(agreement_threshold=0.8)`

`name = "debate"`, `rounds = 2`. Early-exits after round 1 when agreement >= `agreement_threshold`; otherwise runs a revision round where each agent sees peer answers and revises.

### `ConsensusResult(final_answer, method, agent_count, responses, agreement=0.0, rounds=1, disagreed=False)`

Dataclass. `to_dict()` returns the wire shape (agreement rounded to 3 places; each response normalized to `{"agent", "confidence", "answer"[, "statement"]}`).

### `parse_structured_output(raw: str) -> ParsedResponse`

Module-level (`tractum.consensus`). Parses the `answer` / `confidence` / `reasoning` block; `ParsedResponse(answer, confidence=0.5, reasoning="")`.

## Coordinator (hierarchical, non-consensus)

### `Coordinator(config, api_key=None)`

Methods: `add_sub_agent(agent_id: str, agent: Agent)`, `add_sub_swarm(swarm_id: str, swarm: Swarm)`, `await coordinate(task: Task) -> Task`. Decomposes the task via a real JSON plan parse (falls back to a single whole-task sub-task if unparseable), assigns specialists by exact id or role-substring match, executes sub-tasks in dependency order with independent ones in parallel, and synthesizes a final answer.

### `CoordinatorConfig(name="Coordinator", role="Task Coordinator and Manager", instructions=..., model="claude-3-5-sonnet-20241022", temperature=0.7, max_tokens=4096)`

### `SubTask(id, parent_task, description, assigned_to=None, specialist_role=None, dependencies=[], status="pending", result=None)`

Dataclass.

## Runtime

### `Runtime()`

Process supervision: `await start()`, `await stop()`, `spawn_agent(config, agent_id=None) -> str`, `create_swarm(config, swarm_id=None) -> str`, `await submit_task(swarm_id, task) -> Task`, `get_status() -> dict`. Also exports `AgentProcess` and `AgentStatus` (`tractum.runtime`).

## Signing and receipts

### `ConsensusReceipt(payload, algorithm="", public_key="", signature="", payload_hash="", signed_at="", metadata={})`

Dataclass. See [Receipts](../concepts/receipts.md) for the field-by-field anatomy.

- `ConsensusReceipt.from_result(result: ConsensusResult, swarm_name="", task_id="", statements=None, quorum=None) -> ConsensusReceipt` — classmethod; unsigned. Statements default to those attached to the responses; a receipt with statements is a v2 payload, without them v1.
- `canonical_payload() -> str`, `to_dict() -> dict`, property `is_signed -> bool`.

### `SignatureBackend` (ABC)

`algorithm: str` class attribute. Abstract: `generate_keypair() -> tuple[str, str]`, `sign(message: bytes, private_key_hex: str) -> str`, `verify(message: bytes, signature_hex: str, public_key_hex: str) -> bool`. Concrete inherited methods: `sign_receipt(receipt, private_key_hex) -> ConsensusReceipt` (signs in place, stamps `signed_at`), `verify_receipt(receipt) -> bool`, `sign_statement(statement, private_key_hex) -> dict`, `verify_statement(statement) -> bool`.

### `Ed25519Backend`

Default backend, `algorithm = "ed25519"`. No extra dependencies.

### `MLDSABackend`

`algorithm = "mldsa65"`. Requires `tractum[pq]`. ML-DSA-65 (FIPS 204); same interface, receipts self-tag the algorithm.

### `default_backend() -> SignatureBackend`

Returns an `Ed25519Backend`.

### `sign_statement(statement, private_key_hex, backend=None) -> dict` / `verify_statement(statement) -> bool`

Module-level Ed25519-convenience wrappers. Custom backends: call the methods on the backend instance directly.

### `statement_hash(statement: dict) -> str`

sha256 over the canonical form of the statement's signed content (envelope keys stripped).

### `verify_receipt_detailed(receipt, expected_operator_pubkey="", expected_agent_pubkeys=None) -> ReceiptVerification`

Full end-to-end verification. See [Receipts](../concepts/receipts.md) for the check order and failure reasons.

### `StatementVerification(agent, valid, reason="")` and `ReceiptVerification(aggregate_valid, statements, quorum, valid_statements, total_statements)`

Dataclasses. `ReceiptVerification` properties: `quorum_met -> bool`, `valid -> bool` (`aggregate_valid and quorum_met`).

## Transports (`tractum.transports`)

- `to_json_receipt(receipt) -> dict` — `type: claudeway.receipt.v1`.
- `to_verifiable_credential(receipt, issuer_did="") -> dict` — W3C VC v2.0-compatible envelope.
- `to_nostr_event(receipt, private_key_hex, created_at=None, d_tag="tractum-consensus") -> NostrEvent` — kind 30078 NIP-78 event; requires `tractum[nostr]` (coincurve, BIP-340 Schnorr).
- `to_log_anchor_event(anchor, private_key_hex, log_name="", created_at=None) -> NostrEvent` — transparency-log anchor event.
- `NostrEvent(id, pubkey, created_at, kind, tags, content, sig)` dataclass with `to_dict()`.
- Constants: `NOSTR_CONSENSUS_KIND = 30078`, `NOSTR_TRANSPARENCY_D_TAG = "tractum-transparency"`.

## Transparency log (`tractum.transparency`)

- `TransparencyLog(name="tractum")` — `append(receipt) -> int` (leaf index), `size -> int`, `root -> bytes`, `inclusion_proof(leaf_index) -> InclusionProof`, static `verify_inclusion(receipt, proof, expected_root) -> bool`.
- `InclusionProof(leaf_index, tree_size, audit_path=[])`.
- `LogAnchor(tree_size, root, published_at, nostr_event_id=None)` with `to_dict()` (`type: tractum.transparency.anchor.v1`).
- `leaf_hash(receipt) -> bytes` (sha256 of `0x00` + canonical payload), `node_hash(left, right) -> bytes` (sha256 of `0x01` + left + right).

## .curt linkage (`tractum.curt_link`)

- `build_curt_transcript(result, *, conversation_id="", title="") -> dict`
- `link_receipt(receipt, transcripts, *, backend=None, private_key_hex="") -> ConsensusReceipt`
- `emit_curt_decision(receipt, transcripts, *, conversation_id="", title="") -> dict`
- `receipt_from_curt_decision(doc) -> ConsensusReceipt`
- `verify_curt_link(receipt, transcripts, *, expected_operator_pubkey="", expected_agent_pubkeys=None) -> CurtLinkVerification`
- `parse_curt(text) -> dict`, `validate_curt(doc) -> list[str]`, `curt_transcript_hash(doc) -> str`, `transcript_refs(docs) -> list[dict]`, `receipt_refs(receipt) -> list[dict]`
- `CurtLinkError(ValueError)`; result dataclasses `CurtLinkVerification` and `TranscriptLink`.

## MCP server (`tractum.server`)

Console script `tractum-mcp` (installed with `tractum[mcp]`; entry point `tractum.server:main`). Flags: `--http` (HTTP/SSE instead of stdio), `--host` (default `127.0.0.1`), `--port` (default `8765`).

Tools exposed to MCP clients:

- `reach_consensus(question: str, specialists: list[dict[str, str]], strategy: str = "weighted_vote", context: dict | None = None, dry_run: bool = False) -> dict` — specialists are `{"name", "role", "instructions"[, "model"]}` dicts. Returns the signed JSON receipt.
- `verify_consensus(receipt: dict, expected_operator_pubkey: str = "", expected_agent_pubkeys: dict[str, str] | None = None) -> dict` — returns `valid`, `aggregate_valid`, `quorum`, `valid_statements`, `total_statements`, and per-statement `statements` entries.

Environment variables: `TRACTUM_SIGNING_KEY` (hex Ed25519 private key — pinned operator signing; unset means an ephemeral keypair per receipt, marked `metadata.operator_key: "ephemeral"`), `TRACTUM_REQUIRE_PINNED_KEY=1` (fail loudly instead of shipping an ephemeral-signed receipt), `TRACTUM_MCP_DRY_RUN=1` (deterministic offline stub agents, swarm name `mcp-consensus-dry-run`, no API calls).

## Streaming events (`tractum.events`)

Pydantic models, discriminator `kind`:

- `ConsensusEvent` base: `schema_version="1.0"`, `swarm_id`, `task_id`, `kind`.
- `AgentCompleted`: `kind="agent_completed"`, `agent`, `answer`, `confidence`, `round=1` — fires inside the gather as each answer lands.
- `ConsensusResolved`: `kind="consensus_resolved"`, `final_answer`, `method`, `agreement`, `rounds`, `disagreed` — fires once per run.

## Framework adapters (`tractum.adapters`)

Each adapter lazy-imports its framework; install the matching extra first.

- LangGraph (`tractum.adapters.langgraph`, extra `langgraph`): `make_consensus_node(swarm, *, input_key="question", sign=False, signing_key=None, task_id=None, stream=False)` returns an async node function; `build_consensus_graph(swarm)` returns a prebuilt compiled subgraph (`{"question": str}` in). State schema: `ConsensusState` TypedDict.
- Microsoft Agent Framework (`tractum.adapters.maf`, extra `maf`): `make_consensus_executor(swarm, *, sign=False, signing_key=None, task_id=None, stream=False)` returns an `Executor`; `build_consensus_workflow(swarm)` returns a prebuilt one-node workflow; `consensus_as_agent(swarm)` wraps it as a MAF `Agent`.
- CrewAI (`tractum.adapters.crewai`, extra `crewai`): `reach_consensus(swarm, *, sign=False, signing_key=None, task_id=None)` returns a CrewAI `@tool`; `ConsensusFlow(swarm)` is a prebuilt async Flow.
