---
title: Guardrails
description: Complete guardrail reference — ast-gate, scope-guard, loop-breaker
sidebar_position: 3
---

<!-- sources: src/hooks/ast-gate.ts, src/guard/scope-guard.ts, src/loopbreak/loop-breaker.ts, src/daemon/registry.ts, src/daemon/session.ts, src/types.ts, README.md -->

# Guardrails

Every guardrail implements the `Guardrail` interface from `src/types.ts`:

```ts
export interface Guardrail {
  name: string;
  inspect(event: AgentEvent): Verdict | null;
  observe(event: AgentEvent): void;
}
```

`inspect()` runs pre-execution and may return a verdict; `observe()` runs
post-execution for state bookkeeping. Verdict actions are `allow`, `warn`,
`deny`, and `rewrite` (`rewrite` carries `updatedInput`; only the Claude Code
hook mode consumes it).

## Order of evaluation

`loadGuardrails` in `src/daemon/registry.ts` loads modules in a fixed order:

1. `ast-gate` (`src/hooks/ast-gate.ts`)
2. `loop-breaker` (`src/loopbreak/loop-breaker.ts`)
3. `scope-guard` (`src/guard/scope-guard.ts`)

`SupervisorSession.handle` (`src/daemon/session.ts`) runs `inspect()` in that
registration order — the first `deny` or `rewrite` wins and later guardrails
do not inspect. `warn` verdicts do not short-circuit: a warn from an earlier
guardrail is discarded if a later one denies. `observe()` runs on **every**
guardrail regardless of the verdict outcome.

Each guardrail receives constructor options `{ workdir, allowedPaths }` where
`workdir` is the `--workdir` value (or cwd) and `allowedPaths` are the
`--scope` values. There is no config file; per-run tuning is by code-level
options (`LoopBreakerOptions`, `ScopeGuardOptions`, `AstGateOptions`).

## Summary table

| Guardrail | What it does |
| --------- | ------------ |
| `ast-gate` | Tree-sitter parse of Edit/Write content (TS + Python). Denies `child_process`/`subprocess`; warns on destructive deletes outside the workdir, Python `eval`/`exec`, network egress. Parse errors fail open. |
| `scope-guard` | Real path containment (resolve + relative, Windows-safe). Denies writes outside the workdir/scope and to CI/config surfaces; warns on package-manifest writes. |
| `loop-breaker` | Deterministic kill signals: identical (tool, input) fingerprint, byte-identical shell output streaks, repeated test-failure hashes. All thresholds configurable. See [Loop-breaking](./loop-breaking.md). |

---

## ast-gate

Source: `src/hooks/ast-gate.ts`. A tree-sitter guardrail over file-edit tool
inputs.

**Applies to tools:** `Edit`, `Write`, `MultiEdit` (`GATED_TOOLS`).

**Content extraction** (`extractEditTarget`): reads `file_path` from the tool
input, maps the extension to a language (`.ts` and `.js` to `ts`, `.tsx` and
`.jsx` to `tsx`, `.py` to `py`), and takes the new content: `content` for
Write, `new_string` for Edit, the concatenation of every hunk's `new_string`
for MultiEdit. Unknown extensions or missing content return null — nothing to
gate.

**Fail-open contract:** if the tree-sitter grammars cannot load, the parse
throws, or the tree `hasError`, the gate returns `allow` with an explanatory
reason. It never denies on something it could not evaluate. An internal
exception in the hook path also fails open (`src/hooks/cc-hook.ts`).

**Rule table** (`AST_RULES`, data-only; extend the table, not the engine):

| Rule id | Action | Languages | Matches |
| ------- | ------ | --------- | ------- |
| `node-child-process` | deny | ts, tsx | Import/require/import of `child_process` or `node:child_process` |
| `python-subprocess` | deny | py | Import of `subprocess`; calls to `subprocess.run`, `subprocess.call`, `subprocess.check_call`, `subprocess.check_output`, `subprocess.Popen`, `subprocess.getoutput`, `subprocess.getstatusoutput` |
| `destructive-delete` | warn | ts, tsx, py | Calls to `fs.rmSync`, `fs.rm`, `fsPromises.rm`, `rimraf`, `shutil.rmtree`, `os.remove`, `os.removedirs`, `os.unlink`, plus bare `rmSync`, `rimraf`, `rmtree` |
| `python-eval-exec` | warn | py | Bare callees `eval` and `exec` |
| `network-egress` | warn | ts, tsx, py | Bare `fetch`; any callee whose first dotted segment is `axios`, `requests`, `httpx`, `urllib`, `http`, `https`, `got`, `superagent`, `node-fetch` |

**Deletion path check:** for `destructive-delete`, if the first call argument
is a string literal that resolves *inside* the session workdir, no verdict is
emitted for that call — deleting inside the workdir is fine. Relative paths
resolve against the workdir; `~` paths and empty strings are undeterminable
and still warn.

**Verdict:** if any deny rule matched, the verdict is `deny` listing the deny
findings (e.g. `ast-gate: node-child-process: child_process import/require in
written code (module "child_process")`). Otherwise warn findings become a
`warn`. No findings is `allow`. Findings beyond the first include the line
number.

`observe()` is a no-op — ast-gate is pre-execution only.

---

## scope-guard

Source: `src/guard/scope-guard.ts`. Worktree-diff scope containment.

**Applies to tools** (`FILE_TOOLS`): `Edit`, `Write`, `MultiEdit`,
`NotebookEdit`, `write_file`, `file-create`, `create_file`.

**Target extraction** (`extractTargetPath`): reads the first non-empty string
from input fields `file_path`, `path`, `notebook_path` (in that priority
order); a bare string input is treated as the path itself. No path field — no
verdict.

**Containment** (`isWithin`): both root and target are `path.resolve`d, then
`path.relative` is checked for a leading `..` or an absolute remainder. On
Windows the comparison is case-insensitive. If the resolved target is inside
the workdir, or inside any `allowedPaths` root (the `--scope` values), the
write passes containment. Otherwise:

```text
deny — scope-guard: <resolved> is outside workdir and not covered by any allowedPaths entry
```

**Denied patterns:** the resolved path is substring-matched (forward-slash,
case-folded) against the v1 defaults:

- `.git/`
- `.github/workflows/`
- `.claude/settings.json`

plus any extra patterns in `ScopeGuardOptions.deniedPatterns`. A match denies
with the matched pattern in the reason — unless an `allowedPaths` entry
contains the path, which is the explicit-allow override (an exact `--scope`
root that itself covers the target).

**Manifest warn:** if the file basename (case-folded) is one of
`package.json`, `package-lock.json`, `requirements.txt`, the verdict is `warn`
with reason `scope-guard: <base> is a package manifest — dependency changes
need review`.

Otherwise `allow`. `observe()` is a no-op — the guard is stateless.

---

## loop-breaker

Source: `src/loopbreak/loop-breaker.ts`. Full treatment on
[Loop-breaking](./loop-breaking.md); short form: three deterministic detectors
(identical-call fingerprints, repeated failure signatures, no-progress shell
output streaks) with deny thresholds 5 (identical), 4 (failure signature) and
warn thresholds 3 / 3. Unlike the other two guardrails it is stateful
(per-session) and its `observe()` does the bookkeeping.
