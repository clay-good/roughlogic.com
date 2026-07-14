# roughlogic.com Specification v777 -- Firewood Cord Volume (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`** (Group L),
> no new module, group, or dependency. Inherits spec.md through spec-v776.md. Explore sweep #19 (entry 3).
>
> **The gap, and the evidence for it.** An arborist or firewood seller needs to measure a stack in **cords**, and no tile
> does it. A full (standard) cord is statutorily **128 stacked cubic feet**, so `cords = length x height x depth / 128`.
> The number this settles: an **8 x 4 x 4 ft** stack is exactly **1.00 cord**; a 20 x 4 x 4 ft stack is 2.5. Grep confirmed
> no `firewood` / `cord` / `128 cubic` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group L
arborist siblings: the stack dimensions carry `L`, the stacked volume `L^3`, and the cord count is dimensionless. The
v18/v21 contract: a non-finite input (via `_finiteGuard`) or a non-positive length, height, or depth returns `{ error }`.
Citation discipline (v19/v22): the full-cord = 128 ft^3 definition by name (NIST Handbook 130, Uniform Regulation for the
Method of Sale of Commodities), `GOVERNANCE.general`; the note states firewood must be sold by the cord or a fraction (not
'face cord', 'rick', or 'truckload'), that the 128 ft^3 is **stacked** volume including air gaps (solid wood ~70-90%),
and that the state weights-and-measures office governs the legal sale.

## 2. The tile

### 2.1 `firewood-cord` -- Firewood Cord Volume

```
inputs:
  length_ft   stack length (ft, > 0)
  height_ft   stack height (ft, > 0)
  depth_ft    stack depth = log length (ft, > 0)

volume_ft3 = length_ft x height_ft x depth_ft
cords      = volume_ft3 / 128
```

**Pinned worked example.** L = 8, H = 4, D = 4:
`volume = 8 x 4 x 4 = 128 ft^3`; `cords = 128/128 = ` **1.00**. A 16 x 4 x 2 stack is also 128 ft^3 (1 cord), and a
20 x 4 x 4 stack is 320/128 = 2.5 cords. The count is linear in each dimension -- pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["arborist"]`) placed with the later Group L arborist tiles **outside the
exact-count (30) `// Group L: Agriculture` .. `// Group M` audit block** (beside `tree-height-clinometer`), so the audit
is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the NIST cord definition, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`firewood-cord` ->
`computeFirewoodCord`); `scripts/related-tiles.mjs` (-> `log-limb-weight` / `chipper-debris` / `tree-height-clinometer`);
`data/search/aliases.json` (5 collision-checked aliases: "how many cords of firewood", "cord of wood", ...); the
calc-arborist `ARBORIST_RENDERERS` map entry via a hand-written renderer (length, height, depth fields) and the id added
to the calc-arborist declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the full-cord identity, the
linearity, and the error seams. The calc-arborist.js gzip cap (raised to 20500 B in this spec) covers the addition.
Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,225 -> 1,226.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1.00 cord for an 8 x 4 x 4
ft stack).

## 5. Roadmap position

Adds the everyday firewood measurement to the arborist bench alongside log weight and chip volume. Continues the
post-inverse forward-coverage vein (Explore sweep #19). A firewood BTU / heat-value tile is the natural next addition but
its species heat table carries convention nuances; it stays evidence-driven.
