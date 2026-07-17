# roughlogic.com Specification v865 -- Wall / Roof Sheathing Panel and Nail Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v864.md. Framing sweep, beside `plywood-span` and
> `residential-framing`.
>
> **The gap, and the evidence for it.** `plywood-span` rates a panel and `residential-framing` rolls up lumber, but
> nothing takes off the **sheathing panels and nails**. Grep confirmed no sheathing-takeoff tile. The number this settles:
> a 1,600 sf wall at 8% waste is **54 sheets**, and at a 6-in edge / 12-in field pattern (about 60 nails a sheet) that is
> **3,240 nails** -- and a tight shear-panel schedule roughly doubles the nails.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
framing siblings (`plywood-span`, `residential-framing`): the area and sheet area carry `L^2`, the waste and
nails-per-sheet are dimensionless, and the sheet and nail counts are dimensionless. The v18/v21 contract: a non-finite or
non-positive area, sheet area, or nails-per-sheet returns `{ error }`; a negative waste returns `{ error }`. Citation
discipline (v19/v22): the takeoff identity by name (sheets = ceil(area x (1 + waste) / sheet area); nails = sheets x
nails-per-sheet), `GOVERNANCE.general`; the note states that the nails-per-sheet comes from the nailing schedule the
carpenter reads off the plans (a 6-in edge / 12-in field pattern is about 60 nails on a 4x8, a 4-in / 6-in shear panel
far more -- the value is entered, not reproduced from a code table), and that this is distinct from the `plywood-span`
rating and the `residential-framing` lumber rollup.

## 2. The tile

### 2.1 `sheathing-takeoff` -- Wall / Roof Sheathing Panel and Nail Takeoff

```
inputs:
  area_sf         area to sheathe (ft^2)
  waste_pct       waste allowance (percent, default 8)
  sheet_sf        panel area (ft^2, default 32)
  nails_per_sheet nails per panel from the schedule (count, default 60)

sheets = ceil(area_sf * (1 + waste_pct/100) / sheet_sf)
nails  = sheets * nails_per_sheet
```

**Pinned worked example.** Area 1,600 sf, 8% waste, 32 sf panels, 60 nails/sheet:
`sheets = ceil(1600*1.08/32) = ceil(54.0) = ` **54**; `nails = 54*60 = ` **3,240**. Cross-check: a shear-wall schedule at
about 104 nails per panel gives `54*104 = ` **5,616 nails** on the same 54 sheets -- the nailing schedule, not the area,
drives the fastener order.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry", "construction"]`, inside the `// Group E` construction block near
`plywood-span`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (sheets = ceil(area(1+waste)/sheet); nails = sheets x nails/sheet, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the shear-panel cross-check); `test/fixtures/compute-map.js`
(`sheathing-takeoff` -> `computeSheathingTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `plywood-span` / `residential-framing` / `construction-adhesive-tubes`); `data/search/aliases.json` (5
collision-checked aliases: "sheathing takeoff", "plywood sheet count", "osb panel count", "sheathing nails", "wall
sheathing estimate"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `drywall` count renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the sheet count, the nail count, and the error seams (non-positive area, sheet area,
nails-per-sheet; negative waste). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,313 -> 1,314.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(1600*1.08/32) -> 54 sheets, 3,240 nails).

## 5. Roadmap position

Framing takeoff beside `plywood-span` (rating) and `residential-framing` (lumber), serving the framer (carpentry /
construction). Next framing candidate: subfloor / panel construction adhesive. Stays evidence-driven; the nailing schedule
governs.
