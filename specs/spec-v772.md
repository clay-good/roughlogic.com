# roughlogic.com Specification v772 -- Clinometer Tree Height (Percent-Slope) (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`** (Group L),
> no new module, group, or dependency. Inherits spec.md through spec-v771.md. Explore sweep #18 (entry 3).
>
> **The gap, and the evidence for it.** The arborist bench covers log weight, rigging, basal area, decay, and the critical
> root zone, but not the most basic field measurement: **standing tree height**. The forestry method reads a clinometer's
> percent scale from a known horizontal distance: `H = D x (top% - base%)/100`, both readings signed (+ above eye level,
> - below). The number this settles: at **100 ft** with a **+58%** top and a **-4%** base (base below eye), the tree is
> **62 ft**. Grep confirmed no `tree height` / `clinometer` / `hypsometer` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group L
arborist siblings: the distance and heights carry `L`, the percent-slope readings are dimensionless. The v18/v21
contract: a non-finite input (via `_finiteGuard`), a non-positive horizontal distance, or a top reading not greater than
the base reading returns `{ error }`. Citation discipline (v19/v22): the percent-slope tree-height method by name (USDA
Forest Service mensuration / hypsometry), `GOVERNANCE.general`; the note explains the signed-reading convention (+ above
eye adds when the base is below, subtracts when uphill), the degree-to-percent conversion (`% = 100 tan(a)`), and that it
assumes the sighted top is directly above the base and `D` is the true horizontal distance.

## 2. The tile

### 2.1 `tree-height-clinometer` -- Clinometer Tree Height (Percent-Slope)

```
inputs:
  horizontal_distance_ft   horizontal distance D to the trunk (ft, > 0)
  top_reading_pct          percent slope to the top (signed: + above eye)
  base_reading_pct         percent slope to the base (signed: - below eye)

above_eye_ft   = D x top_reading_pct  / 100
below_eye_ft   = D x base_reading_pct / 100
tree_height_ft = above_eye_ft - below_eye_ft   = D x (top% - base%)/100
```

**Pinned worked example.** D = 100 ft, top = +58%, base = -4%:
`above = 58 ft`, `below = -4 ft`, `H = 58 - (-4) = ` **62 ft**. A base at eye level (0%) gives just the top component
(58 ft); a base uphill above eye (+10%) subtracts (48 ft). Height is exactly `D x (top - base)/100` and linear in
distance -- both pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["arborist"]`) placed with the later Group L arborist tiles **outside the
exact-count (30) `// Group L: Agriculture` .. `// Group M` audit block** (beside `crown-pruning-dose`), so the audit is
untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the percent-slope method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`tree-height-clinometer` ->
`computeTreeHeightClinometer`); `scripts/related-tiles.mjs` (-> `log-limb-weight` / `tree-protection-zone` /
`basal-area-prism`); `data/search/aliases.json` (5 collision-checked aliases: "tree height from a clinometer", "how tall
is a tree", ...); the calc-arborist `ARBORIST_RENDERERS` map entry via a hand-written renderer (distance and two signed
percent-reading fields) and the id added to the calc-arborist declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the base-at-eye and uphill cases, the closed form and linearity across a sweep, and the error seams.
The calc-arborist.js gzip cap (raised to 19000 B in this spec) covers the addition. Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,220 -> 1,221.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 62 ft for a 100 ft
distance, +58% top, -4% base).

## 5. Roadmap position

Adds the field measurement the arborist bench was missing -- standing tree height -- alongside the rigging, mensuration,
and tree-risk tiles. Continues the post-inverse forward-coverage vein (Explore sweep #18). A DBH-tape / diameter tile or
a two-chain (66 ft) hypsometer variant is the natural next mensuration addition; it stays evidence-driven.
