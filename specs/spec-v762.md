# roughlogic.com Specification v762 -- Projected Cell Count from Doubling Time (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`** (Group T),
> no new module, group, or dependency. Inherits spec.md through spec-v761.md. Explore sweep #15 (entry 4, final). Closes
> Explore sweep #15.
>
> **The gap, and the evidence for it.** The `doubling-time` tile measures the doubling time from two counts; the inverse
> **projects the count forward from a known doubling time** over an elapsed time. Solving `Td = t x ln2 / ln(N/N0)` for N
> gives `N = N0 x 2^(t / Td)`. The number this settles: **100,000** cells at an **8 h** doubling time reach **800,000** in
> **24 h** (3 doublings, 8x).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`doubling-time` sibling: the initial and projected counts, doubling time, elapsed time, doublings, and fold increase carry
the sibling's dimensionless treatment. It reuses the sibling's exponential-growth relation, solved for the count. The
v18/v21 contract: any non-finite input, a non-positive initial count, doubling time, or elapsed time returns `{ error }`.
Citation discipline (v19/v22): the relation solved for the count, `GOVERNANCE.general` matching the sibling; the note
states that this holds only in **log (exponential) phase** (the projection over-predicts as the culture nears stationary
phase) and that if N is an **optical density** the ratio assumes OD stays proportional to cell count, with the culture and
conditions governing.

## 2. The tile

### 2.1 `growth-projected-count` -- Projected Cell Count from Doubling Time

```
inputs:
  initial_count   dimensionless initial count or OD N0 (> 0)
  doubling_time   dimensionless doubling time Td (h, > 0)
  elapsed_time    dimensionless elapsed time t (h, > 0)

doublings     = elapsed_time / doubling_time
fold_increase = 2^doublings
final_count   = initial_count x fold_increase
```

**Pinned worked example.** N0 = 100,000, Td = 8 h, t = 24 h:
`doublings = 24 / 8 = 3`, `fold = 2^3 = 8`, `N = 100000 x 8 = ` **800,000**. Feeding 800,000 back through `doubling-time` at
the same N0 and t returns an 8 h doubling time, the input. Halving the doubling time to 4 h reaches ~6.4 million in the same
24 h (6 doublings).

## 3. Wiring

A `tools-data.js` row (group `T`, trades `["lab"]`) placed beside `doubling-time` (Group T is not exact-count audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (relation solved for the count, `GOVERNANCE.general` matching the
sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`growth-projected-count` -> `computeGrowthProjectedCount`); `scripts/related-tiles.mjs` (-> `doubling-time` /
`od600-cell-count` / `cfu-plate-count`); `data/search/aliases.json` (4 collision-checked question aliases: "projected cell
count", "cells after time", ...); the calc-lab `LAB_RENDERERS` map entry via a hand-written renderer (three number fields)
and the id added to the calc-lab declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeDoublingTime` across an N0/Td/t sweep, the more-time-more-count and shorter-Td-more-count
behavior, and the error seams. The calc-lab.js gzip cap (raised to 23000 B in this spec) covers the addition. Verify at
build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,210 -> 1,211.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 800,000 for 100,000 cells at
an 8 h doubling time over 24 h).

## 5. Roadmap position

Pairs the forward doubling-time tile (Td from two counts) with its inverse (the projected count from a doubling time), the
two halves of the exponential-growth relation. Closes Explore sweep #15 (all clean candidates landed; a fresh sweep opens
the next batch). Further Group T lab growth stays evidence-driven.
