# roughlogic.com Specification v873 -- Self-Leveling Underlayment Bag Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v872.md. Flooring sweep, beside `thinset-coverage`
> and `flooring-takeoff`.
>
> **The gap, and the evidence for it.** The catalog covers thin-set bond coat (`thinset-coverage`) but nothing counts
> **self-leveling underlayment** bags, where the yield depends on the average pour thickness. Grep confirmed no
> self-leveler tile. The number this settles: 500 sf poured at 1/4 in average, on a 6.25 sf-inch bag yield, is 20 bags neat
> -- **21 with waste** -- the order that has to be staged before the pour starts, because SLU sets fast.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
flooring siblings (`thinset-coverage`, `flooring-takeoff`): the area carries `L^2`, the average thickness `L`, the bag
yield `L^3` (square-foot-inch), the waste is dimensionless, and the bag counts are dimensionless. The v18/v21 contract: a
non-finite or non-positive area, thickness, or bag yield returns `{ error }`; a negative waste returns `{ error }`.
Citation discipline (v19/v22): the bag-count identity by name (neat bags = area x thickness / bag yield; bags = ceil(neat
x (1 + waste))), `GOVERNANCE.general`; the note states that the bag yield is the product's coverage at a reference
thickness (a bag that does 50 sf at 1/8 in yields 6.25 square-foot-inches), that a self-leveler is poured so the thickness
varies across the floor (use the average from a survey), and that this is distinct from the troweled `thinset-coverage`.

## 2. The tile

### 2.1 `self-leveler-bags` -- Self-Leveling Underlayment Bag Count

```
inputs:
  area_sf          area to pour (ft^2)
  avg_thickness_in average pour thickness (in)
  bag_yield_sf_in  bag yield (square-foot-inches, default 6.25)
  waste_pct        waste allowance (percent, default 5)

neat_bags = area_sf * avg_thickness_in / bag_yield_sf_in
bags      = ceil(neat_bags * (1 + waste_pct/100))
```

**Pinned worked example.** Area 500 sf, average 1/4 in, yield 6.25 sf-in, 5% waste:
`neat = 500 * 0.25 / 6.25 = ` **20 bags**; `bags = ceil(20 * 1.05) = ` **21**. Cross-check: a deeper 1/2 in average pour
doubles the neat count to `500 * 0.5 / 6.25 = 40` and `ceil(40*1.05) = ` **42 bags** -- the average thickness drives the
order, which is why a low floor with deep spots eats material.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["flooring", "construction"]`, inside the `// Group E` construction block near
`thinset-coverage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (bags = ceil(area x thickness / bag yield x (1 + waste)), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the deeper-pour cross-check); `test/fixtures/compute-map.js`
(`self-leveler-bags` -> `computeSelfLevelerBags`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `thinset-coverage` / `flooring-takeoff` / `concrete`); `data/search/aliases.json` (5 collision-checked aliases:
"self leveler bags", "self leveling underlayment", "slu bag count", "floor leveler quantity", "self leveling cement
bags"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `thinset-coverage` renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the neat and rounded bag counts and the error seams (non-positive area, thickness,
bag yield; negative waste). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,321 -> 1,322.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(500*0.25/6.25*1.05) -> 21 bags).

## 5. Roadmap position

Flooring tile beside the troweled `thinset-coverage`, serving the flooring installer (flooring / construction). Stays
evidence-driven; the product bag yield governs.
