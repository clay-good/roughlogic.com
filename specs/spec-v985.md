# roughlogic.com Specification v985 -- Open-Delta (V-V) Transformer Bank Capacity (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v984.md. Joins the transformer family
> (`transformer-kva-sizing`, `transformer-loading-efficiency`, `transformer-turns-ratio`, ...).
>
> **The gap, and the evidence for it.** The catalog sizes and analyzes single transformers, but nothing covers the
> open-delta (V-V) bank -- three-phase from two transformers, common on rural and light-commercial services and after a
> unit fails. Grep confirmed no open-delta / V-V tile. The number this settles, and the one tradespeople get wrong: two
> 25 kVA units in open delta serve **43.3 kVA**, not 50.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, kVA and a percent from kVA), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive
transformer rating, or a negative load returns `{ error }`. Citation discipline (v19/v22): the open-delta (V-V)
connection capacity by name, `GOVERNANCE.general`; the note explains that two units give sqrt(3) (not 2) times one
unit, that each carries the load / sqrt(3) so the bank is capped at 86.6% of the two installed and 57.7% of the
closed-delta three-unit bank, and that the transformer nameplate, the load balance and power factor, and the utility
govern.

## 2. The tile

### 2.1 `open-delta-transformer` -- Open-Delta (V-V) Transformer Bank Capacity

```
inputs:
  transformer_kva_each  rating of each single-phase unit (kVA), default 25
  required_load_kva     balanced three-phase load to serve (kVA), default 40

available_3ph_kva   = sqrt(3) x transformer_kva_each
per_transformer_kva = required_load_kva / sqrt(3)
utilization_pct     = 100 x per_transformer_kva / transformer_kva_each
verdict: required_load_kva <= available_3ph_kva -> OK; else overloaded
```

**Pinned worked example.** Two 25 kVA units, 40 kVA three-phase load: `available = sqrt(3) x 25 = ` **43.3 kVA**; each
carries `40 / sqrt(3) = 23.09 kVA` = **92.4%** of its rating -> OK. Cross-check: the same two units against a 75 kVA
load load each to `75 / sqrt(3) = 43.30 kVA` = **173%** -> OVERLOADED (75 > 43.3 available). Note the bank is 86.6% of
the two installed (43.3 / 50) and 57.7% of a closed-delta three-unit bank (43.3 / 75).

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `max-circuit-length-for-vd`); a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (open-delta V-V capacity, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the overload cross-check, pinning the available kVA,
per-unit kVA, and utilization); `test/fixtures/compute-map.js` (`open-delta-transformer` ->
`computeOpenDeltaTransformer`, module `../../calc-electrical.js`); `scripts/related-tiles.mjs` (->
`transformer-kva-sizing` / `transformer-loading-efficiency` / `transformer-turns-ratio`); `data/search/aliases.json`
(5 collision-checked aliases: "open delta", "open delta transformer", "v-v connection", "two transformer three phase",
"open delta capacity"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`ELECTRICAL_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-electrical declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the base and overload cases, the 86.6% / 57.7% identities,
the linear unit-size scaling, and the error seams. The calc-electrical.js gzip cap and the Group A group shell are
watched at build (headroom available; no raise needed). Home tile count 1,433 -> 1,434.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(two 25 kVA / 40 kVA load -> 43.3 kVA, 92.4%).

## 5. Roadmap position

Transformer analysis beside the other transformer tiles, serving the electrician / utility technician (electrical).
Deliberately the capacity screen; the transformer nameplate kVA and impedance, the actual load balance and power
factor, and the serving utility govern the real bank. Stays evidence-driven. Continues the electrical sweep at 1 new
spec (v985).
