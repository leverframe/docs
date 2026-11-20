---
title: Quickstart
sidebar_position: 2
description: Install tractum and run a signed 3-agent consensus end to end.
---

<!-- sources: pyproject.toml, QUICKSTART.md, examples/quickstart.py, tractum/server.py -->

# Quickstart

From zero to a signed consensus answer.

## 1. Install

The base install is the consensus SDK (four dependencies: `anthropic`, `cryptography`, `httpx`, `pydantic`):

```bash
pip install tractum
```

Optional extras:

```bash
pip install tractum[mcp]         # expose consensus as an MCP server
pip install tractum[nostr]       # sign Nostr events (BIP-340 via coincurve)
pip install tractum[pq]          # ML-DSA-65 post-quantum signature backend
pip install tractum[langgraph]   # LangGraph StateGraph adapter
pip install tractum[maf]         # Microsoft Agent Framework adapter
pip install tractum[crewai]      # CrewAI @tool + Flow adapter
pip install tractum[runner]      # FastAPI control plane
pip install tractum[persist]     # SQLite persistence (sqlalchemy + aiosqlite)
```

Requires Python 3.11+.

## 2. Set your Anthropic key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

The key is read directly or passed via `Swarm(api_key=...)`. Default model per agent is `claude-3-5-sonnet-20241022` (override on `AgentConfig`).

## 3. Run your first swarm

Save as `hello.py`:

```python
import asyncio
import os

from tractum import AgentConfig, Swarm, SwarmConfig, Task

async def main():
    swarm = Swarm(
        SwarmConfig(
            name="HelloSwarm",
            description="Pick a database for a small side project",
            agents=[
                AgentConfig("Dba", "Senior DBA", "You weigh reliability and ops cost."),
                AgentConfig("Indie", "Indie Hacker", "You optimize for setup time."),
                AgentConfig("Security", "Security Engineer", "You care about data safety."),
            ],
        ),
        api_key=os.getenv("ANTHROPIC_API_KEY"),
    )

    task = Task(
        id="q1",
        description="Which database should a solo developer use for a side project?",
        input_data={},
    )
    completed = await swarm.process(task)
    print(completed.result["final_answer"])
    print(f"agreement: {completed.result['agreement']:.0%}  "
          f"disagreed: {completed.result['disagreed']}")

asyncio.run(main())
```

The three Claude calls run in parallel (`asyncio.gather`, not serial). `WeightedVote` runs by default — one round, picks the highest-confidence answer, and surfaces disagreement via `agreement` and `disagreed`.

Every agent also signs its stance with its own key (ephemeral by default, pinnable via `AgentConfig.signing_key`). The signed statements ride along in the result, so the receipt built next is already k-of-n.

## 4. Sign the result

```python
from tractum import ConsensusReceipt, ConsensusResult, AgentResponse, Ed25519Backend

# Rebuild a ConsensusResult from the task's dict form (as in examples/quickstart.py)
result = ConsensusResult(
    final_answer=completed.result["final_answer"],
    method=completed.result["method"],
    agent_count=completed.result["agent_count"],
    responses=[
        AgentResponse(
            agent_name=r["agent"],
            answer=r["answer"],
            confidence=r["confidence"],
            statement=r.get("statement"),
        )
        for r in completed.result["responses"]
    ],
    agreement=completed.result["agreement"],
    rounds=completed.result["rounds"],
    disagreed=completed.result["disagreed"],
)

receipt = ConsensusReceipt.from_result(result, swarm_name="HelloSwarm", task_id="q1")
backend = Ed25519Backend()
private_key, public_key = backend.generate_keypair()  # persist in real use
backend.sign_receipt(receipt, private_key)

assert backend.verify_receipt(receipt) is True
# Tamper with the payload and verification fails.
```

In production, set the `TRACTUM_SIGNING_KEY` environment variable (hex Ed25519 private key) instead of generating keys per run.

## 5. Run as an MCP server (optional)

Let any MCP-capable agent (Claude Code, Cursor, Goose, Buzz) call consensus as a tool:

```bash
pip install tractum[mcp]
tractum-mcp            # stdio (local agents)
tractum-mcp --http     # HTTP/SSE (remote agents, default host 127.0.0.1 port 8765)
```

Two tools are exposed: `reach_consensus(question, specialists, strategy, context, dry_run)` returns a signed receipt; `verify_consensus(receipt, ...)` returns the full statement-by-statement verdict.

## Next

- [Consensus model](./concepts/consensus.md) — strategies, agreement scoring, revision rounds
- [Receipts](./concepts/receipts.md) — receipt anatomy and signing backends
- [Examples](./examples.md) — runnable demos for every surface
