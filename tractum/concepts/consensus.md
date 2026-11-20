---
title: Consensus Model
sidebar_position: 3
description: How stances are collected, aggregated, and turned into a k-of-n quorum.
---

<!-- sources: tractum/consensus.py, tractum/swarm.py, tractum/agent.py, tractum/events.py -->

# Consensus Model

## Stance collection

A `Swarm` runs every agent concurrently with `asyncio.gather` — a 3-agent swarm issues all three Claude calls in parallel, not serially. Failed agents are dropped from the round (their exception is captured by `return_exceptions=True`), so a dead agent shrinks `n` rather than stalling consensus.

Each agent is prompted to emit a structured output block as its entire response:

```text
<answer>
[your full response]
</answer>
<confidence>0.0-1.0</confidence>
<reasoning>one short sentence</reasoning>
```

`parse_structured_output` extracts the three fields and is tolerant of three failure modes:

- No tags at all — the whole raw text becomes the answer.
- Open-but-never-closed `answer` tag (small models truncating at `max_tokens`) — everything after the opening tag is the answer.
- Missing confidence or reasoning — defaults kick in (`0.5` / `""`). Confidence is clamped to the range 0.0 through 1.0.

As each response lands, the swarm signs the agent's stance with that agent's own key (`Swarm._sign_statement`). The statement dict carries `type` (`claudeway.agent-statement.v1`), `swarm`, `task_id`, `agent`, `role`, `model`, `round`, `answer`, `confidence`, and `signed_at` — then `SignatureBackend.sign_statement` adds `algorithm`, `public_key`, `statement_hash`, and `signature`. This signed statement is the building block of a k-of-n receipt.

## Strategies

Both strategies ship in `tractum.consensus`. Implement `ConsensusStrategy` to add your own (tournament, human-in-loop, etc.).

### WeightedVote (default)

One round, N Claude calls. Picks the answer with the highest reported confidence. `disagreed` is set when the agreement score falls below `0.6` or the winner's confidence is below `0.6`.

### Debate

Two rounds, up to `2N` calls. If the first round's agreement score is at or above `agreement_threshold` (default `0.8`), the debate is considered settled and the costly revision round is skipped. Otherwise each agent sees its peers' answers with their confidences and revises; an agent whose revision fails falls back to its prior response. The final answer is the highest-confidence revised response, and `disagreed` is set when the revised agreement is still below the threshold.

### Agreement scoring

Both strategies use `_agreement_score`: the share of total confidence mass backing the plurality answer, where answers are grouped after normalization (lowercase, collapsed whitespace, stripped trailing punctuation). A score of `1.0` means everyone converged on one answer; a split vote scores lower. This is a surface-form match — agents writing different prose that substantively agree score low today.

```python
from tractum import Debate, Swarm, SwarmConfig, WeightedVote

swarm = Swarm(config, consensus=WeightedVote())  # cheap default
swarm = Swarm(config, consensus=Debate())        # revision round on disagreement
```

## The result

`ConsensusResult` fields:

| Field | Meaning |
|---|---|
| `final_answer` | The winning answer text |
| `method` | Strategy name: `weighted_vote` or `debate` |
| `agent_count` | How many responses were aggregated |
| `responses` | The `AgentResponse` list, each carrying its signed `statement` |
| `agreement` | Agreement score in 0.0 through 1.0 (1 = full convergence) |
| `rounds` | Rounds actually executed (1, or 2 for a run debate) |
| `disagreed` | Explicit disagreement flag |

`Swarm.process(task)` returns the completed `Task` whose `result` is this dict (`to_dict()` form). Observer events stream alongside: wire an `on_event` callback to receive `AgentCompleted` (per agent, inside the gather) and `ConsensusResolved` (once, at the end). Observer errors are swallowed so a buggy observer can never surface as an agent failure.

## What k-of-n means here

`n` is the number of per-agent signed statements carried in a receipt payload; `k` is the quorum threshold — how many valid statements a verifier must find. `ConsensusReceipt.from_result` defaults `quorum` to `len(statements)` (unanimous); pass an explicit `quorum` value for partial quorum. The threshold is stored inside the signed payload, so a post-hoc downgrade is detectable: `verify_receipt_detailed` counts statements whose signature, hash, task pinning, key pinning, and response cross-checks all hold, and `quorum_met` is true only when the valid count reaches `k`. See [Receipts](./receipts.md) for the verification order.
