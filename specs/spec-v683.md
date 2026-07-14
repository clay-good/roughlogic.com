# roughlogic.com Specification v683 -- Punch Capacity: Max Hole or Thickness (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group G,
> fabrication / sheet-metal), no new module, group, or dependency. Inherits spec.md through spec-v682.md.
>
> **The gap, and the evidence for it.** Spec-v40 (`punch-force`) runs the shear relation forward: given a hole and
> thickness, it returns the punching force. The shop-floor question a fabricator asks is the inverse -- **what is the
> biggest hole (or the thickest material) my press can punch**. The forward tile makes you guess hole sizes and re-read
> the force against the press rating; the inverse solves it directly. From `F = perimeter x thickness x shear strength`
> with a round perimeter `pi x D`, the max thickness is `F / (pi x D x shear)` and the max diameter is
> `F / (pi x T x shear)`, where `F` is the press capacity in pounds (tons x 2000). The number this settles: a **9.8 ton**
> press punches a **0.5 in** hole in **0.25 in** of 50 ksi-shear steel -- or, the other way, a half-inch hole in that
> same quarter-inch plate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`punch-force` sibling: the diameter and thickness are `L` (in), the shear strength is `dimensionless` (psi, as the
sibling labels it), and the capacity and returned force follow the sibling's `dimensionless` force convention. It reuses
the sibling's `F = perimeter x T x shear` shear relation and the `tons x 2000` conversion. The v18/v21 contract: any
non-finite input, a non-positive capacity or shear strength, an unknown solve-for mode, or a missing/non-positive known
dimension returns `{ error }`. Citation discipline (v19/v22): the punching-force relation solved for capacity,
first-principles as in Machinery's Handbook, by name; the note states that **this solves a round hole (a rectangular or
shaped hole uses its own perimeter), the shear strength is user-supplied (~0.8 x UTS for mild steel), and margin matters
-- the press should exceed the punch force, the punch and die need adequate strength, and a shear-ground or stepped
punch lowers the peak force -- the press, tooling, and material govern**.

## 2. The tile

### 2.1 `punch-capacity` -- Punch Capacity: Max Hole or Thickness

```
inputs:
  capacity_tons        tons   press capacity (> 0)
  shear_strength_psi   psi    material shear strength (> 0, ~0.8 x UTS)
  solve_for            -      thickness (given a diameter) or diameter (given a thickness)
  diameter_in          in     hole diameter (when solving for thickness)
  thickness_in         in     material thickness (when solving for diameter)

F = capacity_tons x 2000
max_thickness = F / (pi x diameter_in x shear_strength_psi)   [in]   (solve_for = thickness)
max_diameter  = F / (pi x thickness_in x shear_strength_psi)  [in]   (solve_for = diameter)
```

**Pinned worked example (max thickness).** capacity = 9.8175 tons, shear = 50,000 psi, a 0.5 in hole:
`F = 9.8175 x 2000 = 19,635 lb`, `max_thickness = 19635 / (pi x 0.5 x 50000) = ` **0.25 in**; feeding a 0.5 in hole at
0.25 in through `punch-force` returns 9.8175 tons, the press capacity. **Cross-check (max diameter).** Same press and
shear, solving for the diameter in 0.25 in stock: `max_diameter = 19635 / (pi x 0.25 x 50000) = ` **0.5 in** -- the
symmetric answer.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["fabrication", "sheet-metal"]`, beside `punch-force`, which sits in the
spec-v40 shop section OUTSIDE the exact-32 `// Group G: Cross-Trade`..`// Group H:` audit block, so no count bump); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (shear relation solved for capacity, `GOVERNANCE.general` matching
the sibling, the note per §1); `test/fixtures/worked-examples.json` (both examples, both solve-for modes);
`test/fixtures/compute-map.js` (`punch-capacity` -> `computePunchCapacity` in `../../calc-shop.js`);
`scripts/related-tiles.mjs` (-> `punch-force` / `press-brake-tonnage` / `metal-weight` / `bend-allowance`, and the
forward tile links back); `data/search/aliases.json` ("max hole a press can punch", "biggest hole for press tonnage",
"what can my ironworker punch", plus adjacent rows); `SHOP_RENDERERS["punch-capacity"]` via a hand-written renderer with
a solve-for `makeSelect` (the select feeds the compute, satisfying check-dead-inputs) and the id added to the calc-shop
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both modes, the round-trip through `computePunchForce`, and
the error seams. The calc-shop.js gzip cap (raised to 22000 B for v680) is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 0.25 in max thickness for a 9.8 ton press).

## 5. Roadmap position

Pairs the forward punch tile (`punch-force`, force from a hole) with its inverse (max hole/thickness from a press
capacity), the two halves of the punching-capacity question. Further Group G growth stays evidence-driven.
