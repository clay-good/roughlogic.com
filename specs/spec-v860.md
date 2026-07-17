# roughlogic.com Specification v860 -- Duct Hanger Load and Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v859.md. HVAC sheet-metal sweep, beside
> `duct-metal-weight` and `duct-wrap-takeoff`.
>
> **The gap, and the evidence for it.** Nothing gives the **duct hanger** load and count -- the weight each hanger carries
> at a chosen spacing and the number of hangers a run needs. Grep confirmed no duct-hanger tile (`pipe-support-spacing` is
> for pipe). The number this settles: a duct weighing 5.5 lb/ft on 8 ft centers puts **44 lb** on each hanger, and a 40 ft
> run takes **6 hangers** -- the support layout beside the metal takeoff.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
sheet-metal siblings (`duct-metal-weight`, `pipe-support-spacing`): the per-foot duct weight is force-per-length
`M T^-2`, the spacing and run carry `L`, the hanger safe working load is a force `M L T^-2`, the per-hanger load is a force
`M L T^-2`, the count is dimensionless, and the utilization is dimensionless. The v18/v21 contract: a non-finite or
non-positive per-foot weight, spacing, or run returns `{ error }`; a negative hanger SWL returns `{ error }`. Citation
discipline (v19/v22): the hanger identity by name (load = per-foot weight x spacing; count = ceil(run / spacing) + 1),
`GOVERNANCE.general`; the note states that the maximum spacing follows SMACNA (about 8-10 ft for rectangular duct, entered
here), that the per-foot weight comes from `duct-metal-weight` (plus wrap and any water in a coil), that the hanger, rod,
or strap safe working load is the manufacturer's, and that large duct goes on a trapeze.

## 2. The tile

### 2.1 `duct-hanger-load` -- Duct Hanger Load and Count

```
inputs:
  duct_lb_per_ft  duct weight per foot (lb/ft)
  spacing_ft      hanger spacing (ft, default 8)
  run_ft          run length (ft)
  hanger_swl_lb   hanger safe working load (lb, default 0 = skip)

load_per_hanger_lb = duct_lb_per_ft * spacing_ft
count              = ceil(run_ft / spacing_ft) + 1
utilization        = hanger_swl_lb > 0 ? load_per_hanger_lb / hanger_swl_lb : null
```

**Pinned worked example.** Duct 5.5 lb/ft, spacing 8 ft, run 40 ft, hanger SWL 0 (skip):
`load = 5.5 * 8 = ` **44 lb**; `count = ceil(40/8) + 1 = ` **6 hangers**. Cross-check: a heavier lined duct at 9 lb/ft on
10 ft centers is `9 * 10 = ` **90 lb/hanger** over `ceil(40/10)+1 = ` **5 hangers** -- wider spacing means fewer hangers
but more load on each, which is what the hanger SWL check catches.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["sheet-metal", "hvac"]`, inside the `// Group E` construction block beside
`duct-metal-weight`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (load = per-foot weight x spacing; count = ceil(run/spacing)+1, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wider-spacing cross-check); `test/fixtures/compute-map.js`
(`duct-hanger-load` -> `computeDuctHangerLoad`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `duct-metal-weight` / `duct-wrap-takeoff` / `pipe-support-spacing`); `data/search/aliases.json` (5 collision-checked
aliases: "duct hanger load", "duct strap spacing", "duct hanger count", "duct support load", "ductwork hangers"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `duct-metal-weight` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the per-hanger load, count, the utilization (and null-when-skipped seam), and the error seams (non-positive per-foot
weight, spacing, run; negative hanger SWL). The calc-construction.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,308 -> 1,309.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(5.5 * 8 -> 44 lb, ceil(40/8)+1 -> 6 hangers).

## 5. Roadmap position

Completes the HVAC sheet-metal trio (`duct-metal-weight`, `duct-wrap-takeoff`, `duct-hanger-load`): metal, insulation,
support. Serves the sheet-metal worker (sheet-metal / hvac). Stays evidence-driven; SMACNA and the hanger manufacturer
govern.
