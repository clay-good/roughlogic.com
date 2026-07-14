# roughlogic.com Specification v799 -- Aggregate Fineness Modulus (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v798.md. Explore sweep #23 (entry 3).
>
> **The gap, and the evidence for it.** Concrete producers and materials techs summarize a sand's gradation with its
> **fineness modulus**, and no tile does it (`sieve` = 0 repo-wide). `FM = sum of the cumulative percent retained on the
> standard sieves / 100`. The number this settles: cumulative retained of **2/12/32/57/82/95** on #4-#100 sums to 280,
> so **FM = 2.80**, within the ASTM C33 concrete-sand band of 2.3-3.1. Grep confirmed no fineness-modulus / sieve tile
> exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
aggregate/soil QC siblings (`relative-compaction`, `atterberg-indices`): the six cumulative-percent-retained inputs and
the fineness modulus are all dimensionless. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a value
outside `[0, 100]`, or a non-monotonic stack (a finer sieve retaining less than a coarser one, which is physically
impossible for cumulative retained) returns `{ error }`. Citation discipline (v19/v22): aggregate fineness modulus by
name (ASTM C136 sieve analysis; ASTM C125 definition; ASTM C33 concrete-sand limits), `GOVERNANCE.general` matching the
siblings; the note states the sum/100 definition, that fine-aggregate FM uses the #4-#100 sieves (coarser sieves add 0
for a sand), the C33 2.3-3.1 band and 0.20 drift limit, and that FM is a gradation summary -- not the full sieve
acceptance (two gradations can share an FM).

## 2. The tile

### 2.1 `fineness-modulus` -- Aggregate Fineness Modulus (ASTM C136)

```
inputs:
  r4, r8, r16, r30, r50, r100   cumulative percent retained on each sieve (%, non-decreasing)

FM = (r4 + r8 + r16 + r30 + r50 + r100) / 100
band: < 2.3 fine | 2.3-3.1 ASTM C33 concrete sand | > 3.1 coarse
```

**Pinned worked example.** Cumulative percent retained #4 = 2, #8 = 12, #16 = 32, #30 = 57, #50 = 82, #100 = 95: sum =
280, `FM = 280 / 100 = ` **2.80**, within the ASTM C33 concrete-sand band. A coarser sand (higher retained fractions)
raises the FM.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]` -- kept off the near-cap construction trade so its group shell
stays under budget) beside `atterberg-indices`; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (ASTM C136 /
C125 / C33, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`fineness-modulus` -> `computeFinenessModulus`); `scripts/related-tiles.mjs` (->
`relative-compaction` / `atterberg-indices` / `soil-phase-relations`, all calc-earthwork siblings);
`data/search/aliases.json` (5 collision-checked aliases: "fineness modulus", "how coarse is my concrete sand", "astm c33
concrete sand gradation", ...); the calc-earthwork `EARTHWORK_RENDERERS` map entry via a hand-written renderer
(non-exported, so no DOM-sentinel row) with six sieve inputs, and the id added to the calc-earthwork declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the FM sum, the coarser-is-higher direction, and the error seams (out-of-range,
non-monotonic). The calc-earthwork.js gzip cap is unchanged (the addition fits under the current cap). Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,247 -> 1,248.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (2/12/32/57/82/95 -> FM 2.80).

## 5. Roadmap position

Adds the aggregate gradation summary -- fineness modulus -- to the earthwork / materials QC bench, beside relative
compaction and the Atterberg indices, and complements the concrete-yield delivery check. Continues Explore sweep #23 (a
water-cementitious-ratio tile is the last, weakest survivor). The catalog is now very saturated.
