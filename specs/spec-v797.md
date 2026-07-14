# roughlogic.com Specification v797 -- Concrete Yield and Relative Yield (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v796.md. Explore sweep #23 (entry 1).
>
> **The gap, and the evidence for it.** A concrete QC tech or foreman checks whether a load delivered the yards ordered
> with the **ASTM C138 yield**: the volume a batch actually makes is its total mass divided by the measured fresh unit
> weight. No tile does it (`ready-mix-concrete-order` sizes trucks from in-place volume, never from batch weights). `yield
> = total batch mass / unit weight`; `relative yield = yield / design volume`. The number this settles: a **3,993 lb**
> batch at **148 lb/ft^3** makes **0.999 yd^3** at **564 lb/yd^3** cement. Grep confirmed no concrete-yield / relative-
> yield / C138 tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`ready-mix-concrete-order`, `rebar-weight-takeoff`): the total batch mass and cement mass carry `M`,
the unit weight carries `M L^-3`, the design volume and the yields carry `L^3`, the relative yield is dimensionless, and
the cement content carries `M L^-3`. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive batch
mass, unit weight, or design volume, or a negative cement mass returns `{ error }`; a cement mass of 0 skips the cement
content (`null`). Citation discipline (v19/v22): ASTM C138 / AASHTO T121 concrete yield by name (ACI 211.1),
`GOVERNANCE.general` matching the siblings; the note states the mass/density basis, reads the relative yield (below 1.0
= short/denser/more cement per yard; above 1.0 = over-yield/lighter/cement diluted), that the unit weight must be
measured per C138, and that this checks volume and cement content, not air or strength.

## 2. The tile

### 2.1 `concrete-yield` -- Concrete Yield and Relative Yield (ASTM C138)

```
inputs:
  total_batch_mass_lb            sum of all batched material masses (lb)
  measured_unit_weight_lb_ft3    fresh unit weight per ASTM C138 (lb/ft^3)
  design_volume_yd3              the batch's design (intended) volume (yd^3)
  cement_mass_lb                 cementitious in the batch (lb, 0 to skip)

yield_ft3            = total_batch_mass_lb / measured_unit_weight_lb_ft3
yield_yd3            = yield_ft3 / 27
relative_yield       = yield_yd3 / design_volume_yd3
cement_content_lb_yd3 = cement_mass_lb / yield_yd3
```

**Pinned worked example.** Batch 3,993 lb (cement 564 + water 282 + coarse 1918 + fine 1229), unit weight 148.0 lb/ft^3,
design 1.0 yd^3, cement 564 lb: `yield = 3993 / 148 = 26.98 ft^3 = ` **0.999 yd^3**; `relative yield = ` **0.999** (a hair
short); `cement content = 564 / 0.999 = ` **564.4 lb/yd^3**. Drop the unit weight to 145 (lighter / more air) and the
yield rises to 1.020 yd^3 (over-yield, cement diluted to 553 lb/yd^3).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`) beside `ready-mix-concrete-order`; a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (ASTM C138, `GOVERNANCE.general`); `test/fixtures/
worked-examples.json` (the pinned example, three pinned outputs); `test/fixtures/compute-map.js` (`concrete-yield` ->
`computeConcreteYield`); `scripts/related-tiles.mjs` (-> `ready-mix-concrete-order` / `fresh-concrete-temp` /
`rebar-weight-takeoff`); `data/search/aliases.json` (5 collision-checked aliases: "concrete yield", "did the concrete
truck short me", "relative yield astm c138", ...); the calc-construction `CONSTRUCTION_RENDERERS` map entry via the
`_simpleRenderer` factory (non-exported, so no DOM-sentinel row) and the id added to the calc-construction declare list
in `app.js` (the module whose declare block owns the concrete field tiles); the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the yield, the
relative yield, the cement content, the short flag, and the error seams. The calc-construction.js gzip cap is unchanged
(the addition fits under the current cap). Verify at build, including `check-shells` (the group-shell gzip cap). Lazy-
loaded, absent from home first paint. Home tile count 1,245 -> 1,246.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (3,993 lb at 148 lb/ft^3 -> 0.999 yd^3, Ry 0.999).

## 5. Roadmap position

Adds the concrete delivery-QC check every foreman and materials tech runs -- yield and relative yield -- beside the
ready-mix order and fresh-concrete-temperature tiles. Opens Explore sweep #23. A flat-glass lite-weight tile (for
handling) and an aggregate fineness-modulus tile are the other survivors of the sweep; they stay evidence-driven. The
catalog is now very saturated (this sweep found only a handful of clean gaps).
