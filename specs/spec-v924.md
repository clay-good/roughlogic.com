# roughlogic.com Specification v924 -- Max Microinverters per AC Branch Circuit (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v923.md. PV / electrical install-ops sweep, beside
> the accepted `branch-circuit-wire-footage` and `pv-interconnection-busbar` tiles.
>
> **The gap, and the evidence for it.** The catalog checks the PV busbar (`pv-interconnection-busbar`) and DC circuit
> ampacity (`pv-circuit-ampacity`) but nothing counts microinverters per AC branch. Grep confirmed no microinverter
> tile. Every microinverter array is laid out branch by branch. The number this settles: a 20 A branch with a 1.21 A
> IQ7+ allows **13 microinverters**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
electrical tiles: the branch OCPD, unit current, and branch load carry `I` (current), and the microinverter count is
dimensionless. The v18/v21 contract: a non-finite or non-positive branch OCPD or unit current returns `{ error }`.
Citation discipline (v19/v22): the branch-count identity by name (limit = OCPD x 0.80; N = floor(limit / unit current)),
`GOVERNANCE.general`; the note states that a microinverter's AC output is a continuous load so NEC 690.8(B) / 705.60 /
240.4 limit the combined continuous output to 80% of the branch OCPD, that the unit's MAXIMUM continuous AC output
current (not module wattage over voltage) must be used, that the branch conductors and the point-of-connection get the
same 125% continuous sizing, and that the datasheet, the AHJ, and the adopted NEC edition govern.

## 2. The tile

### 2.1 `microinverter-branch-count` -- Max Microinverters per AC Branch Circuit (NEC 705.60)

```
inputs:
  branch_ocpd_a       branch overcurrent device (A)
  unit_max_current_a  microinverter max continuous AC output current (A, datasheet)

continuous_limit_a = branch_ocpd_a x 0.80
max_microinverters = floor(continuous_limit_a / unit_max_current_a)
branch_load_a      = max_microinverters x unit_max_current_a
```

**Pinned worked example.** 20 A branch, IQ7+ at 1.21 A:
`limit = 20 x 0.80 = 16 A`; `N = floor(16 / 1.21) = floor(13.2) = ` **13 microinverters** (15.73 A load). Cross-check: a
1.0 A unit on the same 20 A branch allows `floor(16 / 1.0) = ` **16**, and a 1.6 A unit only `floor(16/1.6) = ` 10 -- the
count falls as the per-unit output rises.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `branch-circuit-wire-footage`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (branch-count identity, NEC 705.60, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the IQ7+ example plus the 1.0 A cross-check, pinning the count and 80% limit);
`test/fixtures/compute-map.js` (`microinverter-branch-count` -> `computeMicroinverterBranchCount`, module
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `pv-interconnection-busbar` / `pv-circuit-ampacity` /
`pv-string-sizing`); `data/search/aliases.json` (5 collision-checked aliases: "microinverters per branch", "max
microinverters", "microinverter branch circuit", "iq7 per branch", "ac module branch count"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `ELECTRICAL_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the count and 80% limit across three unit currents and the error seams (non-positive OCPD / current, non-finite).
The calc-electrical.js gzip cap and the Group A group shell are watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,372 ->
1,373.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(floor(20 x 0.80 / 1.21) -> 13 microinverters).

## 5. Roadmap position

PV / electrical install-ops beside `pv-interconnection-busbar`, serving the PV installer / electrician (solar /
electrical). Deliberately an install layout; the microinverter datasheet, the AHJ, and the adopted NEC edition govern.
Stays evidence-driven. Continues the PV install-ops sweep at 1 new spec (v924).
