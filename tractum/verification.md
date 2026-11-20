---
title: Verifying a Receipt
sidebar_position: 8
description: How a third party verifies a tractum receipt — the exact algorithms, no tractum install required.
---

<!-- sources: tractum/signing.py, tractum/transports.py, tractum/transparency.py, tractum/server.py, README.md -->

# Verifying a Receipt

A receipt is verifiable forever by anyone. You need three things:

1. The receipt JSON (the `claudeway.receipt.v1` form: `payload`, `payload_hash`, `algorithm`, `public_key`, `signature`, `signed_at`).
2. The expected operator public key — without pinning it, verification only proves self-consistency, not who signed. Anyone can re-sign a doctored payload with their own key.
3. Optionally, per-agent public keys (agent name to hex key) for the strongest verdict.

You can verify with the `tractum` library, through the MCP tool, or by reimplementing the spec below in any language — the canonical form is fully deterministic.

## Option 1: the MCP tool

With `pip install tractum[mcp]`, the `verify_consensus` tool does the full check and returns the statement-by-statement verdict. It is exposed by the `tractum-mcp` server (stdio or `--http`, default port 8765):

```json
{
  "valid": true,
  "aggregate_valid": true,
  "quorum": 3,
  "valid_statements": 3,
  "total_statements": 3,
  "statements": [
    {"agent": "A", "valid": true, "reason": ""}
  ]
}
```

In Python, the same check is `verify_receipt_detailed(receipt, expected_operator_pubkey=..., expected_agent_pubkeys=...)` — see [Receipts](./concepts/receipts.md).

## Option 2: reimplement the spec

### Step 1 — canonical serialization

Serialize the payload deterministically before hashing:

- JSON object keys sorted.
- Separators `","` and `":"` (no whitespace).
- Non-ASCII characters emitted raw (`ensure_ascii=False`).
- Datetime values rendered as ISO 8601 in UTC with microsecond precision.
- Sets/frozensets sorted before serialization.

Call the resulting string `canonical`. Compute `sha256(canonical.encode("utf-8"))` and compare its hex digest to `payload_hash`. A mismatch means the payload was tampered with after signing — stop.

### Step 2 — aggregate signature

`signature` is a hex signature over the exact bytes of `canonical`, verifiable with the `public_key` hex key:

- `algorithm == "ed25519"` — Ed25519 (RFC 8032), raw 32-byte keys, 64-byte signatures.
- `algorithm == "mldsa65"` — ML-DSA-65 (FIPS 204), hex keys and signature.
- Anything else — no defined backend; the receipt cannot be verified as-is.

The receipt is aggregate-valid iff this signature verifies.

### Step 3 — per-agent statements (v2 receipts)

If `payload.type == "claudeway.consensus.v2"`, the payload carries `statements` (list) and `quorum` (integer k). For each statement:

1. Strip the four envelope keys `algorithm`, `public_key`, `signature`, `statement_hash`. What remains is the signed content.
2. Canonically serialize the content (same rules as step 1) and hash with sha256. The hex digest must equal the statement's `statement_hash` field; a mismatch is the reason `hash-mismatch`.
3. Verify `signature` over those same canonical content bytes under the statement's `public_key` (backend selected by the statement's `algorithm` field). Failure is `signature-invalid`.
4. If the statement has a non-empty `task_id`, it must equal the payload's `task_id`; otherwise the reason is `task-id-mismatch` (a stance pinned to one task is worthless inside a receipt for another).
5. If you pinned agent keys, the statement's `public_key` must match the pinned key for that agent name; otherwise `key-mismatch`. This is the defense against a malicious operator fabricating statements under fresh keys.
6. Cross-check against the response attributed to the same agent in `payload.result.responses`: where both the statement and the response carry `answer`, `confidence`, or `round`, the values must match; otherwise the reason is `response-mismatch:<field>`. Statements with no matching response (failed agent, revision round) pass this check on their own evidence.

Count statements that passed all applicable checks as `valid_statements`. The quorum is met iff `valid_statements >= payload.quorum`. The receipt is fully valid iff the aggregate signature is valid AND the quorum is met. Note that `quorum` lives inside the signed payload, so a downgraded threshold breaks the aggregate signature check — it cannot be lowered post-hoc.

v1 receipts (`claudeway.consensus.v1`) have no statements; the aggregate signature alone decides.

### Step 4 — Nostr transport (optional)

If the receipt arrived as a Nostr kind-30078 (NIP-78) event, verify the transport signature first:

- The event `id` is `sha256` over the exact NIP-01 serialization array `"[0,\"<pubkey>\",<created_at>,<kind>,<tags>,\"<content>\"]"` serialized with compact separators.
- The `sig` is a BIP-340 Schnorr signature over the 32-byte event id, verifiable against the x-only `pubkey`.

`nak verify event.json` does this check (silent + exit 0 = signature valid). The repository fixture `examples/buzz_wire_event_v030.json` is a real published event you can use to test a verifier. The event `content` is the JSON receipt — then apply steps 1 through 3 to it. The Nostr key is distinct from the receipt's Ed25519 operator key by design; a relay key rotating does not invalidate receipts.

### Step 5 — transparency log inclusion (optional)

If the receipt was anchored in a transparency log and you have an `InclusionProof` (`leaf_index`, `tree_size`, `audit_path`) plus a published root:

- Leaf hash: `sha256(0x00 || canonical_payload_bytes)` — the same canonical bytes as step 1.
- Node hash: `sha256(0x01 || left || right)`.
- Fold the leaf up through the audit path per RFC 6962 section 2.1.1 (at each level, the index bit decides whether the sibling hashes on the left or the right) and compare to the expected root.

Anchors are published as Nostr kind-30078 events with the `d` tag `tractum-transparency`, so anyone watching the relay sees every published root and a removed anchor is detectable.

## What verification does and does not prove

A valid receipt proves: the payload is byte-identical to what the operator signed, the named agents' statement signatures hold, and the quorum threshold was met at signing time. It does not prove the agents are who you think they are unless you pin keys (step 3, item 5), and a signature proves self-consistency, not identity — pinning is what makes the verdict mean something.
