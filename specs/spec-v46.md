# roughlogic.com Specification v46 — dist/ Integrity Gate Activation

> **Implementation status: CLOSED 2026-06-11 (the close rides the 0.44.0
> stamp shared with spec-v47).** v46 is housekeeping in the spirit of spec-v45
> (which activated the dormant `check-shells` gate). It inherits everything from
> spec.md through spec-v45.md and changes none of the calculator math. **No new
> tiles, no new dependencies, no telemetry, no AI.**

## 1. The finding

A dormant-gate audit -- diff the `scripts/check-*.mjs` scripts against the gates
actually referenced in `.github/workflows/ci.yml` and the `npm run lint` chain --
found that **`check-dist` (spec-v12 §G.3) was never invoked by CI**.

`check-dist.mjs` is the dist/-vs-runtime cross-check: after `npm run build`
produces `dist/`, it walks every shipped HTML / JS / CSS / JSON file and asserts
that every same-origin reference resolves to a file actually present in `dist/`.
It is the inverse of the `check-wiring` G.2 lint: G.2 catches a runtime-imported
`.js` missing from the build's FILES list; G.3 catches the other direction -- a
`fetch("data/foo/bar.json")` or asset reference that the build did not copy, which
would 404 in production. A genuinely useful correctness gate, and a deterministic,
offline one (it only reads files; no network, no browser, no flakiness).

`check-free-access` is the other script not in CI, but that one is **intentionally
opt-in** (its own header: "Not part of `npm run lint`; a free-access URL going 4xx
may be temporary or may indicate the publisher restructured their site, neither of
which should block a release") -- it probes external URLs over the network. So it
is correctly excluded; `check-dist` was the real gap.

## 2. The change

`.github/workflows/ci.yml`: the integration job (which already builds `dist/` for
the shell gates) gains a `npm run check:dist` step after `npm run build`, beside
the `check:shells` (spec-v45) and `check:shell-mobile` (spec-v18 §6) steps. The
gate cannot live in the `lint` chain because it needs a built `dist/` and `lint`
runs before any build in CI.

## 3. As-landed verification

`npm run build` then `npm run check:dist`: **790 files in dist/, 2,011 same-origin
references resolved, 0 dangling, 0 orphan warnings.** The gate passes today, so
wiring it is safe and locks in dist/ integrity against a future change that adds a
reference without shipping its target. `npm run lint`, `npm test`, and `npm run
data:verify` remain green.

## 4. How to find this class

`grep -roE 'check:[a-z-]+' .github/workflows/*.yml` (the gates CI runs) and the
`scripts/check-*.mjs` referenced in the package.json `lint` chain, versus
`ls scripts/check-*.mjs`. Any check script referenced by neither is dormant --
either wire it (if deterministic and passing, like `check-dist` and the v45
`check-shells`) or document why it is opt-in (like `check-free-access`).
