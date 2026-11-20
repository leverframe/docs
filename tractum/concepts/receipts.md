---
title: Receipts
sidebar_position: 4
description: Receipt anatomy, signature backends, verification flow, and Nostr publication.
---

<!-- sources: tractum/signing.py, tractum/signing_pq.py, tractum/transports.py, tractum/transparency.py, tractum/swarm.py -->

# Receipts

A `ConsensusResult` is not just an answer — wrapped in a `ConsensusReceipt`, it is an attestation: a canonical payload signed by a key, verifiable by anyone, with the signature decoupled from how the receipt is transported.

## Canonical serialization

Every signature is computed over `canonical_json(payload)`: JSON with sorted keys, compact separators, no non-ASCII escapes, and fixed ISO 8601 UTC datetime rendering. Two processes producing the same receipt hash identically, so signatures verify across machines and languages. The SHA-256 of that string is stored as `payload_hash` for quick tamper comparison.

## Payload versions

| Constant | Value | Contents |
|---|---|---|
| `CONSENSUS_PAYLOAD_V1` | `claudeway.consensus.v1` | `type`, `swarm`, `task_id`, `result` only |
| `CONSENSUS_PAYLOAD_V2` | `claudeway.consensus.v2` | Adds `statements` (per-agent signed stances) and `quorum` (threshold k) |

The aggregate signature covers the payload, so in a v2 receipt it covers the agent signatures too. v1 receipts remain valid forever; the verifier handles both.

## ConsensusReceipt fields

| Field | Meaning |
|---|---|
| `payload` | The canonical consensus facts (dict; shape above) |
| `algorithm` | Which `SignatureBackend` produced the aggregate signature (`ed25519`, `mldsa65`, ...) |
| `public_key` | Hex-encoded verification key of the operator signer |
| `signature` | Hex signature over sha256 of the canonical payload |
| `payload_hash` | Hex sha256 of the canonical payload |
| `signed_at` | UTC timestamp of signing |
| `metadata` | Free-form, transport-specific hints — **not signed** |

Key methods and properties: `from_result(result, swarm_name="", task_id="", statements=None, quorum=None)` builds an unsigned receipt (statements are gathered from the responses' `statement` fields when omitted); `canonical_payload()` returns the exact string signatures are computed over; `is_signed` is true when signature, public key, and algorithm are all present; `to_dict()` serializes everything.

## Agent statements

Each statement is a dict signed by its agent's own key. Envelope keys (`algorithm`, `public_key`, `signature`, `statement_hash`) are filled in by `sign_statement`; everything else is signed content. `statement_hash` is derived, not trusted — sha256 over the canonical form of the content keys — so a doctored content field is detectable without the key.

## Signature backends

The `SignatureBackend` ABC is intentionally tiny: `generate_keypair()` returns `(private_key_hex, public_key_hex)`, `sign(message, private_key_hex)` returns a hex signature, `verify(message, signature_hex, public_key_hex)` returns a bool. Receipt and statement convenience methods (`sign_receipt`, `verify_receipt`, `sign_statement`, `verify_statement`) are inherited.

| Backend | `algorithm` | Dependency | Notes |
|---|---|---|---|
| `Ed25519Backend` (default) | `ed25519` | `cryptography` (already a base dep) | 64-byte signatures, no new native deps |
| `MLDSABackend` | `mldsa65` | `tractum[pq]` (`dilithium-py`, pure Python) | ML-DSA-65, FIPS 204, NIST level 3; ~3.3 KB signatures, ~2 KB public keys |

Receipts self-tag the algorithm when signed, so the same receipt shape works under either backend and consensus code never changes.

## Verification flow

`verify_receipt(receipt)` (on the backend) checks the operator's aggregate signature plus the payload-hash tamper guard. For the full k-of-n verdict use the module-level function:

```python
from tractum import verify_receipt_detailed

report = verify_receipt_detailed(
    receipt,
    expected_operator_pubkey=operator_pub,      # pin the operator
    expected_agent_pubkeys={"A": pub_a, "B": pub_b},  # pin every agent
)
report.valid            # aggregate_valid AND quorum_met
report.aggregate_valid
report.quorum           # required k
report.valid_statements # how many agent signatures held (k of n)
report.total_statements
report.statements[0].reason  # "" when valid, else a named failure
```

Checks, in order:

1. `payload_hash` matches the payload (tamper guard).
2. The operator's aggregate signature under `receipt.algorithm`.
3. If `expected_operator_pubkey` is given, the receipt must be signed by that key. Without pinning, anyone can re-sign a doctored payload with their own key and it would verify "valid".
4. Every per-agent statement: derived `statement_hash`, signature, optional pinned key, task-id pinning (a statement pinned to task X fails with `task-id-mismatch` inside a receipt for task Y), and a cross-check against the response it claims to attest (`answer`, `confidence`, `round` must match — this stops a valid statement for answer X being recycled as the attestation for answer Y).
5. Quorum: valid statements >= k.

Per-statement failure reasons are named and stable: `key-mismatch`, `task-id-mismatch`, `response-mismatch:answer` (also `:confidence`, `:round`), `hash-mismatch`, `signature-invalid`, `no-backend:<algorithm>`. A v1 receipt (no statements) verifies on the aggregate signature alone; `quorum_met` is then trivially true.

## Transports

Signing is independent of transport (`tractum.transports`):

- `to_json_receipt(receipt)` — plain JSON, `type: claudeway.receipt.v1`.
- `to_verifiable_credential(receipt, issuer_did="")` — W3C VC v2.0-compatible envelope; the receipt signature becomes the `proof`.
- `to_nostr_event(receipt, private_key_hex, created_at=None, d_tag="tractum-consensus")` — a Nostr **kind 30078** (NIP-78 addressable) event. Requires `pip install tractum[nostr]` (coincurve). The event id is sha256 over the NIP-01 serialization array; the event signature is a BIP-340 Schnorr signature (deterministic, zero aux randomness) by a **secp256k1 Nostr key** — distinct from the receipt's Ed25519 signing key by design, so a relay key can rotate without invalidating receipts. Tags: `[["d", d_tag], ["client", "tractum"]]`. Any Nostr client can decode `event.content` and re-verify the inner receipt signature.

Example receipts in this docs site and in `examples/` use placeholder keys. A real published v0.3.0 receipt exists as a wire fixture in the repository at `examples/buzz_wire_event_v030.json` (kind 30078, BIP-340 signed, event id `3974ebfe...bac60b`).

## Transparency log

`tractum.transparency` adds an RFC 6962-style append-only Merkle log over receipts:

- `leaf_hash(receipt)` = sha256(`0x00` + canonical payload) — binds the log to the same bytes the receipt signature covers.
- `TransparencyLog(name="tractum")` with `append` (returns the leaf index), `size`, `root`, `inclusion_proof(leaf_index)`, and the static `TransparencyLog.verify_inclusion(receipt, proof, expected_root)` — a third party needs only the receipt, the proof, and a published root, no log instance.
- `LogAnchor(tree_size, root, published_at)` snapshots are published as Nostr kind-30078 events via `to_log_anchor_event(anchor, private_key_hex, log_name="")`, with the `d` tag `tractum-transparency` so anchors are queryable separately from receipts. Day 1 relies on Nostr's append-only-on-relay semantics; Bitcoin anchoring via OpenTimestamps is planned for day 2.

## .curt linkage

`tractum.curt_link` welds receipts to `.curt` transcript evidence: `build_curt_transcript(result)` renders the consensus round as a conforming `.curt` v1 document; `link_receipt(receipt, transcripts, backend=None, private_key_hex="")` embeds `{id, sha256}` transcript refs under the payload key `curt` (inside the signed payload, so the aggregate signature covers the linkage); `emit_curt_decision` produces one `.curt` file carrying both the receipt and its evidence; `verify_curt_link` re-runs `verify_receipt_detailed` and checks every ref by hash. Linking an already-signed receipt without a key is refused rather than left silently unverifiable.
