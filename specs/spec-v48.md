# roughlogic.com Specification v48 — Content-Security-Policy Integrity Gate

> **Implementation status: CLOSED 2026-06-12 (package stamped 0.44.1, a
> patch).** v48 is a security-invariant gate in the lineage of spec-v45 / spec-v46
> (which activated the dormant `check-shells` and `check-dist` gates). It inherits
> everything from spec.md through spec-v47.md and changes no shipped output -- no
> tiles, no calculator changes, no change to `index.html` or `_headers`
> themselves; it adds a lint gate that protects them. **No new dependencies, no
> telemetry, no AI.**

## 1. The finding

The headline promise -- "0 trackers, 0 LLM calls, works offline" -- is enforced
at runtime by a tight Content-Security-Policy: `default-src 'self'`, `script-src
'self' 'sha256-...'`, `connect-src 'self'`, `object-src 'none'`, with no external
origin in any directive. The policy is shipped twice: as a `<meta
http-equiv="Content-Security-Policy">` in `index.html` (covers the static-hosted
and saved-offline cases) and as a `Content-Security-Policy` response header in
`_headers` (the Cloudflare edge).

The single inline boot script (an anti-FOUC theme-setter) is pinned by its
sha256, and the comment above it states the maintenance burden in plain words:
"recompute its sha256 and update BOTH the script-src in the CSP `<meta>` above and
the Content-Security-Policy line in `_headers`." That is a manual, two-place,
easy-to-forget step on a security-critical mechanism, and **nothing enforced it.**
Two silent-failure modes:

1. **Hash drift.** Edit the boot script, forget to recompute the hash. The
   `<meta>` CSP then blocks the boot script -- but the only visible symptom is a
   flash of un-themed paint, easy to miss -- and the `_headers` CSP is never
   exercised by the local Playwright suite (those headers apply only at the edge),
   so a drift in `_headers` ships completely silently.
2. **Posture weakening.** Someone relaxes `script-src` to admit a CDN, or
   `connect-src` to admit an external API, quietly breaking the
   no-external-network guarantee that "0 trackers / works offline" rests on.

## 2. The gate

`scripts/check-csp.mjs` (wired into the `npm run lint` chain after
`check-manifests`; deterministic, offline, no build needed):

- Strips HTML comments from `index.html` (one comment literally contains the text
  `<script>`, a trap for a naive scan), then extracts the bare inline
  `<script>...</script>` boot script. Asserts there is **exactly one**.
- Recomputes its `sha256` and asserts the hash appears in `script-src` in **both**
  the `index.html` `<meta>` CSP and the `_headers` CSP.
- Asserts `script-src` is exactly `'self'` + that hash (no host, no
  `'unsafe-inline'`, no `'unsafe-eval'`).
- Asserts `default-src` and `connect-src` are exactly `'self'` and `object-src` is
  exactly `'none'`, in both files.
- Asserts **no directive in either CSP admits an external origin** (only `'self'`,
  `'none'`, `data:`, and hash/keyword tokens are allowed).

The gate is negative-tested: a one-byte change to the boot script (hash drift), an
external origin added to `connect-src`, and a weakened directive each redden it.

## 3. As-landed verification

`npm run check:csp` passes on the live repo: the boot-script
`sha256-0qFLOnMo4ZqgtC+YMO+1763cr/ZxTi2v7KEhzLIIz4I=` matches `script-src` in both
`index.html` and `_headers`, and `default-src` / `connect-src` / `object-src` are
locked to `self` / `none` with no external origin. `npm run lint` (now 25 gates),
`npm test` (5,514, unchanged), and `npm run data:verify` remain green. README: the
lint-chain count corrected (it disagreed with itself -- "23-gate" vs "24 gates" --
now 25), a `check-csp` row added to the gate table, and the safety section notes
the policy is now build-time gated.

## 4. Roadmap position

v48 closes the security-invariant audit branch the same way v45/v46 closed the
dormant-gate branch: a core promise that was true and runtime-enforced but not
build-enforced is now build-enforced. The CSP, the dist/ integrity, and the shell
content contract are all gated on every push. Remaining audit angles for future
sessions: whether any other hand-maintained cross-file invariant (the SW precache
list, the integrity sidecar, the JSON-LD allowlist) has a drift mode not yet
gated.
