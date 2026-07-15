# roughlogic.com Specification v802 -- Coil / Roll Stock Length (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`** (Group E,
> sheet-metal), no new module, group, or dependency. Inherits spec.md through spec-v801.md. Fresh Explore sweep #24
> (entry 2), a forward sheet-metal / coil-stock gap.
>
> **The gap, and the evidence for it.** A sheet-metal, roofing-coil, cable-reel, or strip-stock worker constantly needs
> the **length still on a coil** without unrolling it. No tile computes it (`coil` in the catalog is exclusively the HVAC
> cooling-coil family: `coil-face-velocity`, `coil-bypass-factor`, etc.). The number this settles: a 48 in coil on a
> 16 in core at 0.024 in (24 ga) holds **5,585 ft**. The relation is the annulus identity `L = pi (OD^2 - ID^2) / (4 t)`.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
sheet-metal siblings (`multi-bend-flat-pattern`, `rolled-blank`): the coil OD, core ID, and material thickness carry `L`,
and both length outputs carry `L`. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive OD, a
core diameter not less than the OD, or a non-positive thickness returns `{ error }`. Citation discipline (v19/v22): the
coil-length annulus identity by name (first-principles geometry), `GOVERNANCE.general` matching the siblings; the note
states that the wound cross-section is an annulus equal to the unwound length times thickness, that halving the thickness
doubles the length at the same coil OD, and that the result is exact only for a tight coil with no telescoping.

## 2. The tile

### 2.1 `coil-length` -- Coil / Roll Stock Length

```
inputs:
  outside_diameter_in    coil outside diameter OD (in)
  inside_diameter_in     core / mandrel diameter ID (in)
  material_thickness_in  material (strip) thickness t (in)

length_in  = pi (OD^2 - ID^2) / (4 t)
length_ft  = length_in / 12
```

**Pinned worked example.** Coil OD 48 in, core 16 in, thickness 0.024 in (24 ga): `OD^2 - ID^2 = 2304 - 256 = 2048`;
`L = pi x 2048 / (4 x 0.024) = ` 67,021 in = **5,585 ft**. Cross-check: a 40 in coil on a 20 in core at 0.018 in is
4,363 ft; halving the thickness doubles the length wound to the same coil OD.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["sheet-metal", "fabrication"]`) beside `multi-bend-flat-pattern`; a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (annulus identity, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the 40 in cross-check); `test/fixtures/compute-map.js`
(`coil-length` -> `computeCoilLength`); `scripts/related-tiles.mjs` (-> `metal-weight` / `multi-bend-flat-pattern` /
`rolled-blank`); `data/search/aliases.json` (5 collision-checked aliases: "coil length", "roll stock length", "coil
stock length", "strip length on a coil", "remaining coil footage" -- distinct from the HVAC "coil-*" terms); the calc-fab
`FAB_RENDERERS` map entry via a non-exported renderer with OD / core / thickness inputs, and the id added to the calc-fab
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the annulus length, the ft conversion, the thickness/core
monotonicity, and the error seams. The calc-fab.js gzip cap is unchanged. Verify at build, including `check-shells`
(the group-shell gzip cap). Lazy-loaded, absent from home first paint. Home tile count 1,250 -> 1,251.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (48/16/0.024 -> 5,585 ft).

## 5. Roadmap position

Adds the missing forward coil-stock calc to the sheet-metal Group E, beside the flat-pattern and rolled-blank layout
tiles. The catalog remains very saturated; the sweep-24 queue continues. Stays evidence-driven.
