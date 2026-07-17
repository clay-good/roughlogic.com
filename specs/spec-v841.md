# roughlogic.com Specification v841 -- Formwork Tie Load and Spacing (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v840.md. Concrete-operations sweep, completing the
> formwork family with `formwork-pressure` (the pressure) and `shore-post-load` (the vertical shores).
>
> **The gap, and the evidence for it.** `formwork-pressure` gives the lateral pressure and `shore-post-load` sizes the
> vertical shores, but nothing sizes the **wall form ties** that take that lateral pressure in tension. Grep confirmed no
> tie-load tile. The number this settles: at 600 psf on a 24 x 24 in tie grid, each tie carries **2,400 lb** -- inside a
> 3,000 lb tie, so a 5 sf tributary is the most any tie can take -- and pour faster (higher pressure) and the grid has to
> tighten or the wall blows out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
formwork tiles (`formwork-pressure`, `shore-post-load`): the lateral pressure carries `M L^-1 T^-2`, the tie spacings `L`,
the tie safe working load and tie load are forces `M L T^-2`, the tributary area is `L^2`, and the utilization is
dimensionless with a boolean pass. The v18/v21 contract: a non-finite or non-positive lateral pressure, either spacing, or
tie SWL returns `{ error }`. Citation discipline (v19/v22): the tie-load identity by name (tie load = lateral pressure x
horizontal spacing x vertical spacing; max tributary = SWL / pressure), `GOVERNANCE.general`; the note states that the
lateral pressure comes from `formwork-pressure` (ACI 347), that the tie safe working load is the manufacturer's rating
with its own safety factor, that wales and studs are sized separately, and that a tie failure is a form blowout -- the
same accepted quick-check class as `formwork-pressure` and `shore-post-load`, not the engineered design.

## 2. The tile

### 2.1 `formwork-tie-load` -- Formwork Tie Load and Spacing

```
inputs:
  lateral_pressure_psf  design lateral form pressure (psf)
  h_spacing_ft          tie horizontal spacing (ft)
  v_spacing_ft          tie vertical spacing (ft)
  tie_swl_lb            tie safe working load (lb)

tie_load_lb        = lateral_pressure_psf * h_spacing_ft * v_spacing_ft
utilization        = tie_load_lb / tie_swl_lb
pass               = tie_load_lb <= tie_swl_lb
max_trib_area_ft2  = tie_swl_lb / lateral_pressure_psf
```

**Pinned worked example.** Pressure 600 psf, horizontal 2 ft, vertical 2 ft, tie SWL 3,000 lb:
`tie load = 600 * 2 * 2 = ` **2,400 lb**; `utilization = 2400/3000 = ` **0.80**, **pass**; `max tributary = 3000/600 = `
**5.0 sf**. Cross-check: a faster pour that lifts the pressure to 900 psf gives `900*2*2 = ` **3,600 lb** -- over the
tie -- so tightening the grid to 1.5 x 1.5 ft brings it back to `900*2.25 = ` **2,025 lb**, under the SWL.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction", "carpentry"]`, inside the `// Group E` construction
block beside `formwork-pressure`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry
(`E`); a `citations.js` entry (tie load = pressure x h x v; max trib = SWL / pressure, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned pass example plus the faster-pour cross-check);
`test/fixtures/compute-map.js` (`formwork-tie-load` -> `computeFormworkTieLoad`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `formwork-pressure` / `shore-post-load` / `concrete-pour-rate`);
`data/search/aliases.json` (5 collision-checked aliases: "formwork tie load", "form tie spacing", "snap tie load", "wall
form tie", "form tie capacity"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the
`formwork-pressure` verdict renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the tie load, utilization, pass flag, max tributary area, and
the error seams (non-positive pressure, spacings, tie SWL). The calc-construction.js gzip cap is watched at build. Verify
at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home
tile count 1,289 -> 1,290.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(600 * 2 * 2 -> 2,400 lb, pass vs 3,000 SWL).

## 5. Roadmap position

Completes the formwork family (`formwork-pressure` pressure, `shore-post-load` vertical, `formwork-tie-load` horizontal),
fed by `concrete-pour-rate`'s rate of rise, serving the form carpenter (concrete / construction / carpentry). Stays
evidence-driven; the tie manufacturer and ACI 347 govern.
