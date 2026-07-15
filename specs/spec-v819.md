# roughlogic.com Specification v819 -- Welded-Wire Reinforcement (Mesh) Sheet Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v818.md. Flatwork sweep, beside the bar-based
> `rebar-schedule` and `rebar-weight-takeoff` tiles.
>
> **The gap, and the evidence for it.** The catalog schedules reinforcing **bars** (`rebar-schedule`,
> `rebar-weight-takeoff`) but nothing takes off **welded-wire reinforcement** (mesh) for a slab, where the side and end
> laps eat coverage and drive the sheet count. Grep confirmed no mesh / WWF / welded-wire tile. The number this settles: a
> 2,000 sf slab sheeted with 5x10 ft mesh at 6 in laps needs **50 sheets** (2,500 sf purchased), where ignoring the laps
> would under-count at 42 -- the eight sheets the overlaps cost.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
construction siblings (`rebar-schedule`, `drywall`): the slab area and effective sheet area carry `L^2`, the sheet
dimensions and laps `L`, the waste percent is dimensionless, and the sheet count is dimensionless. The v18/v21 contract: a
non-finite or non-positive slab area, sheet width, or sheet length returns `{ error }`; a side or end lap that meets or
exceeds the sheet dimension (a non-positive effective sheet) returns `{ error }`; a negative waste percent returns
`{ error }`. Citation discipline (v19/v22): the lapped-coverage identity by name (effective sheet = (width - side lap) x
(length - end lap); sheets = ceil(area x (1 + waste) / effective sheet)), `GOVERNANCE.general`; the note states that mesh
is lapped one full square (6 in minimum) at the sides and ends, that the ACI / structural drawings set the sheet size and
style (for example 6x6 W2.9), and that the count is a purchase quantity, not a placement plan.

## 2. The tile

### 2.1 `welded-wire-mesh` -- Welded-Wire Reinforcement (Mesh) Sheet Takeoff

```
inputs:
  slab_area_sf     slab area to reinforce (ft^2)
  sheet_width_ft   mesh sheet width (ft, default 5)
  sheet_length_ft  mesh sheet length (ft, default 10)
  side_lap_in      side lap (in, default 6)
  end_lap_in       end lap (in, default 6)
  waste_pct        waste / cutting allowance (percent, default 5)

effective_sheet_sf = (sheet_width_ft - side_lap_in/12) * (sheet_length_ft - end_lap_in/12)
gross_area_sf      = slab_area_sf * (1 + waste_pct/100)
sheets             = ceil(gross_area_sf / effective_sheet_sf)
purchased_sf       = sheets * sheet_width_ft * sheet_length_ft
```

**Pinned worked example.** Slab 2,000 sf, 5x10 ft sheets, 6 in side and end laps, 5% waste:
`effective = (5 - 0.5)*(10 - 0.5) = 4.5*9.5 = ` **42.75 sf**; `gross = 2000*1.05 = 2,100 sf`;
`sheets = ceil(2100 / 42.75) = ceil(49.1) = ` **50 sheets** (2,500 sf purchased). Cross-check: with no laps the same slab
would take `ceil(2100/50) = ` **42 sheets** -- the laps cost eight sheets, which is why the effective area, not the
nominal 50 sf sheet, drives the order.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "concrete"]`, inside the `// Group E` construction block beside
`rebar-schedule`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (sheets = ceil(area (1+waste) / effective sheet), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the no-lap cross-check); `test/fixtures/compute-map.js`
(`welded-wire-mesh` -> `computeWeldedWireMesh`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `rebar-schedule` / `rebar-weight-takeoff` / `concrete`); `data/search/aliases.json` (5 collision-checked aliases:
"welded wire mesh", "wwf sheet takeoff", "slab mesh reinforcement", "welded wire reinforcement count", "concrete mesh
sheets"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `drywall` sheet-count renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the effective sheet area, the sheet count, the purchased area, and the error seams
(non-positive slab area, width, length; lap >= dimension; negative waste). The calc-construction.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,267 -> 1,268.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(2000*1.05 / ((5-0.5)*(10-0.5))) -> 50 sheets).

## 5. Roadmap position

Adds the mesh sheet takeoff beside the bar-based `rebar-schedule` and `rebar-weight-takeoff`, serving the flatwork
contractor (construction / concrete). Next flatwork candidate: curb-and-gutter concrete volume per station. Stays
evidence-driven; the structural drawings set the mesh style.
