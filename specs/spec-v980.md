# roughlogic.com Specification v980 -- Control Valve Authority (Beta) (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v979.md. Controls-commissioning sweep, beside
> the accepted `valve-flow-coefficient` (Cv) and `hydronic-injection-mixing` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes a control valve's Cv (flow capacity), but nothing checks its
> AUTHORITY -- whether it actually controls. Grep confirmed no valve-authority / installed-characteristic tile. Every
> commissioning agent checks it on a hydronic 2-way valve. The number this settles: a 5 psi valve on a 3 psi coil has an
> authority of **0.625**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a ratio of psi), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive valve drop, or a negative
controlled-circuit drop returns `{ error }`. Citation discipline (v19/v22): the control-valve authority by name (ASHRAE
Systems; Belimo/Honeywell control-valve guidance), `GOVERNANCE.general`; the note explains that a valve realizes its
inherent characteristic only if it keeps most of the branch drop, that the target is beta >= 0.5 (near-linear installed
characteristic) with < 0.25 poor, that the fix for low authority is a SMALLER (lower-Cv) valve, and that authority is
separate from the Cv flow-capacity sizing -- the design pressures, valve trim, and engineer/balancer govern.

## 2. The tile

### 2.1 `valve-authority` -- Control Valve Authority (Beta)

```
inputs:
  valve_pressure_drop_psi      valve pressure drop, fully open (psi), default 5
  controlled_circuit_drop_psi  coil + variable piping drop (psi), default 3

valve_authority = valve_pressure_drop_psi / (valve_pressure_drop_psi + controlled_circuit_drop_psi)
verdict: >= 0.5 good (near-linear installed characteristic); 0.25-0.5 tolerable; < 0.25 poor (resize smaller)
```

**Pinned worked example.** 5 psi valve open, 3 psi coil: `beta = 5/(5+3) = ` **0.625** -- good (>= 0.5). Cross-check: an
oversized valve dropping only **1 psi** against a 9 psi coil is `1/(1+9) = ` **0.10** -- poor authority (< 0.25):
distorted control and hunting; the fix is a smaller (lower-Cv) valve.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `hydronic-injection-mixing`); a `tile-meta.js` `_TILES`
entry (`C`); a `citations.js` entry (control-valve authority, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the good-authority example plus the oversized-valve cross-check, pinning beta); `test/fixtures/compute-map.js` (`valve-
authority` -> `computeValveAuthority`, module `../../calc-hvacsystems.js`); `scripts/related-tiles.mjs` (-> `valve-flow-
coefficient` / `hydronic-gpm-deltat` / `outdoor-reset-ratio`); `data/search/aliases.json` (5 collision-checked aliases:
"valve authority", "control valve authority", "valve beta", "installed characteristic", "oversized control valve"),
then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `HVACSYSTEMS_RENDERERS` map (non-exported, so
no DOM-sentinel dims row), and the id added to the calc-hvacsystems declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning beta and the verdict bands and their edges, the larger-drop and zero-circuit directions, and the error seams. The
calc-hvacsystems.js gzip cap and the Group C group shell are watched at build (cap raised for this tile). Home tile count
1,428 -> 1,429.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(5 / 3 -> 0.625).

## 5. Roadmap position

Controls/commissioning beside `valve-flow-coefficient`, serving the controls / commissioning agent / balancer (hvac).
Deliberately the authority ratio; the actual design pressures, the selected valve trim, and the engineer of record or the
balancer govern the valve selection. Stays evidence-driven. Continues the controls-commissioning sweep at 1 new spec
(v980).
