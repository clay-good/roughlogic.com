# roughlogic.com Specification v916 -- Duct Transition (Reducer) Length from Slope (calc-metalair.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-metalair.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v915.md. Sheet-metal duct-fab layout sweep, beside
> the accepted `duct-static-pressure-total` tile.
>
> **The gap, and the evidence for it.** The catalog sizes ducts and sums their static pressure but nothing lays out a
> **transition (reducer) length** for a target slope. Grep confirmed no duct-transition tile. Every duct fabricator lays
> out reducers to a SMACNA-limited slope. The number this settles: a 20 in to 12 in concentric transition at 15 degrees
> per side is **14.93 in** long.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
sheet-metal tiles: the end dimensions and lengths carry `L`, the slope is dimensionless (degrees), and the run-to-offset
ratio is dimensionless. The v18/v21 contract: a non-finite or non-positive dimension, a large dimension not exceeding the
small, or a slope outside 0 to 90 degrees returns `{ error }`. Citation discipline (v19/v22): the transition-length
geometry by name (concentric = ((large - small)/2)/tan(slope); eccentric = (large - small)/tan(slope)),
`GOVERNANCE.general`; the note states that SMACNA keeps the slope near 15 degrees per side (about 4:1) to limit
turbulence and pressure loss, that a concentric transition splits the change to both sides while an eccentric takes it on
one side and needs twice the length, that on a rectangular duct the larger of the width and height changes sets the piece
length, and that the SMACNA duct-construction standards and the system pressure loss govern the acceptable slope.

## 2. The tile

### 2.1 `duct-transition-length` -- Duct Transition (Reducer) Length from Slope

```
inputs:
  large_dim_in   large end dimension (in)
  small_dim_in   small end dimension (in)
  slope_deg      transition slope per side (deg, default 15)

length_concentric_in = ((large_dim_in - small_dim_in) / 2) / tan(slope_deg)
length_eccentric_in  = (large_dim_in - small_dim_in) / tan(slope_deg)     [= 2 x concentric]
slope_ratio          = 1 / tan(slope_deg)
```

**Pinned worked example.** 20 in to 12 in at 15 degrees per side:
`concentric = ((20 - 12)/2) / tan(15) = 4 / 0.26795 = ` **14.93 in**; `eccentric = 8 / 0.26795 = ` **29.86 in** (twice
the concentric, because all the change is on one side); ratio `1/tan(15) = ` 3.73 : 1. Cross-check: a 30 in to 18 in
concentric transition at 15 degrees is `6 / 0.26795 = ` **22.39 in** -- the length scales with the size change for a
fixed slope.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["sheet-metal", "hvac"]`, beside `duct-static-pressure-total`); a
`tile-meta.js` `_TILES` entry (`C`); a `citations.js` entry (transition-length geometry, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the cross-check, pinning concentric and eccentric length);
`test/fixtures/compute-map.js` (`duct-transition-length` -> `computeDuctTransitionLength`, module
`../../calc-metalair.js`); `scripts/related-tiles.mjs` (-> `duct-static-pressure-total` / `round-to-rect-duct` /
`duct-sizing`); `data/search/aliases.json` (5 collision-checked aliases: "duct transition length", "duct reducer
length", "duct taper length", "transition slope", "concentric reducer duct"), then `node scripts/build-alias-shards.mjs`;
a hand-written renderer in the `METALAIR_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to
the calc-metalair declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus
+ tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the concentric and eccentric length, the 2x
relation, the ratio, and the error seams (non-positive dims, large <= small, slope out of range, non-finite). The
calc-metalair.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,364 -> 1,365.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(((20 - 12)/2)/tan(15) -> 14.93 in concentric).

## 5. Roadmap position

Sheet-metal duct-fab layout beside `duct-static-pressure-total`, serving the sheet-metal worker / HVAC installer
(sheet-metal / hvac). Deliberately geometry; the SMACNA duct-construction standards and the system pressure loss govern
the acceptable slope. Stays evidence-driven. Continues the sheet-metal layout sweep at 1 new spec (v916).
