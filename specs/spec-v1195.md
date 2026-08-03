# roughlogic.com Specification v1195 -- Fine Aggregate Grading Check (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-03). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1194.md.
>
> **The gap, and the evidence for it.** The landed `fineness-modulus` tile (spec-v799) names its own limit in its note and
> citation: it "does not check whether each sieve meets its C33 grading band, and two very different gradations can share an
> FM." The fineness modulus is a one-number summary; ASTM C33 acceptance is three tests, and a sand can sit dead-center on FM
> and still fail. No tile runs the band check (grep confirmed no fine-aggregate grading / sieve-acceptance tile exists;
> `soil-gradation-coefficients` covers the USCS curve shape for soil, not the concrete-sand C33 bands). This tile fills the
> gap the summary tile declared.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
aggregate/soil QC siblings (`fineness-modulus`, `relative-compaction`): the seven percent-passing inputs, the fineness
modulus, and the retained percentage are all dimensionless. The v18/v21 contract: a non-finite input (via `_finiteGuard`),
a value outside `[0, 100]`, or a non-monotonic stack (a finer sieve passing more than a coarser one, which is physically
impossible) returns `{ error }`. Citation discipline (v19/v22): ASTM C33/C33M §6 by name, `GOVERNANCE.general` matching the
siblings; the note states all three §6 requirements. **No copyrighted table is reproduced** -- the §6.1 band limits are the
operative acceptance criteria of a material specification adopted by reference into the building code (the same treatment
the FM tile already gives the C33 2.3-3.1 band), and the percent-passing values are the user's own ASTM C136 sieve
analysis. The fineness-modulus leg is **delegated** to `computeFinenessModulus` so the summary tile and the acceptance tile
can never drift on the FM definition.

## 2. The tile

### 2.1 `fine-aggregate-grading` -- Fine Aggregate Grading Check (ASTM C33)

```
inputs:
  p38, p4, p8, p16, p30, p50, p100   percent passing each sieve (%, non-increasing down the stack)

ASTM C33 §6 acceptance (all three must hold):
  §6.1 band (percent passing):  3/8 in 100 | #4 95-100 | #8 80-100 | #16 50-85 | #30 25-60 | #50 5-30 | #100 0-10
  §6.2 consecutive:             retained between any two consecutive sieves <= 45%
  §6.2 fineness modulus:        2.3-3.1  (delegated to fineness-modulus; retained_i = 100 - passing_i)

conforms = band_ok AND consecutive_ok AND fm_ok
```

**Pinned worked example.** Percent passing 3/8 in = 100, #4 = 98, #8 = 85, #16 = 68, #30 = 45, #50 = 18, #100 = 5. Every
sieve is within its band; cumulative retained is 2/15/32/55/82/95 so `FM = 281 / 100 =` **2.81** (in band); the widest
retained gap between consecutive sieves is **27%** (#30 to #50), within the 45% limit. The sand **conforms**. The isolating
cases the fuzzer pins: #16 at 90% fails §6.1 alone; a sand that jumps 85% to 25% across #16 to #30 fails the 45% rule alone
while every band passes; a coarse-edge gradation reads FM 3.45 and fails the FM leg alone.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`) beside `fineness-modulus`; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (ASTM C33/C33M §6, `GOVERNANCE.general`, with a `freeAccess` note explaining the acceptance criteria
are not a proprietary table); `test/fixtures/worked-examples.json` (the pinned example, pinning `fm` and
`max_retained_pct`); `test/fixtures/compute-map.js` and `test/fixtures/renderer-map.js` (spec-v1191 reachability parity);
`scripts/related-tiles.mjs` (-> `fineness-modulus` / `soil-gradation-coefficients` / `water-cement-ratio` /
`relative-compaction`); `data/search/aliases.json` (5 collision-checked aliases; alias shards regenerated); the
calc-earthwork `EARTHWORK_RENDERERS` map entry via a hand-written renderer (non-exported, so no DOM-sentinel row) with the
seven sieve inputs, and the id added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index. Home tile count 1,567 -> 1,568 (index.html JSON-LD + hero lede,
AGENTS.md). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (conforming example -> CONFORMS, FM 2.81, widest
gap 27%).

## 5. Roadmap position

Closes a self-declared gap: the fineness-modulus tile summarized the gradation but explicitly deferred the band acceptance.
The pair now covers both -- the one number for batch-to-batch drift, and the full §6 pass/fail for acceptance -- on the
concrete-materials QC bench beside relative compaction and the water-cementitious ratio.
