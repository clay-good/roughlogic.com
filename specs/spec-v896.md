# roughlogic.com Specification v896 -- PV Racking Rail, Clamp, and Splice Takeoff (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v895.md. Solar install-ops sweep, beside
> `pv-row-spacing`.
>
> **The gap, and the evidence for it.** `pv-row-spacing` gives the array geometry but nothing takes off the **racking
> hardware** -- the rail, mid and end clamps, and splices. Grep confirmed no rail/clamp tile. The number this settles: a
> two-row array of twelve 3.42 ft modules on two rails per row is **164 LF** of rail, **44 mid clamps**, **8 end clamps**,
> and **8 splices** -- the mechanical bill of material behind the electrical design.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A solar
sibling (`pv-row-spacing`): the module width, gap, run length, rail stock, and rail footage carry `L`, and the row,
module, rail, clamp, and splice counts are dimensionless. The v18/v21 contract: a non-finite or non-positive rows,
modules-per-row, module width, rails-per-row, or rail stock returns `{ error }`; a negative gap returns `{ error }`.
Citation discipline (v19/v22): the racking-takeoff identity by name (run = modules x (width + gap); rail = rows x rails x
run; mid clamps = rails x rows x (modules - 1); end clamps = 2 x rails x rows; splices = (ceil(run / stock) - 1) x rails x
rows), `GOVERNANCE.general`; the note states that the rail layout, clamp type, and splice come from the rack
manufacturer's engineering, that a module shares a mid clamp with its neighbor and gets an end clamp at each row end, and
that this counts hardware, not the array spacing `pv-row-spacing` gives.

## 2. The tile

### 2.1 `pv-rail-clamp-takeoff` -- PV Racking Rail, Clamp, and Splice Takeoff

```
inputs:
  rows            module rows (count)
  modules_per_row modules per row (count)
  module_width_ft module width along the rail (ft)
  gap_ft          module-to-module gap (ft, default 0)
  rails_per_row   rails per row (count, default 2)
  rail_stock_ft   rail stock length (ft, default 14)

run_len_ft = modules_per_row * (module_width_ft + gap_ft)
rail_lf    = rows * rails_per_row * run_len_ft
mid_clamps = rails_per_row * rows * (modules_per_row - 1)
end_clamps = 2 * rails_per_row * rows
splices    = (ceil(run_len_ft / rail_stock_ft) - 1) * rails_per_row * rows
```

**Pinned worked example.** 2 rows, 12 modules/row, 3.42 ft wide, 0 gap, 2 rails/row, 14 ft stock:
`run = 12*3.42 = 41.04 ft`; `rail = 2*2*41.04 = ` **164 LF**; `mid = 2*2*11 = ` **44**; `end = 2*2*2 = ` **8**;
`splices = (ceil(41.04/14)-1)*2*2 = 2*4 = ` **8**. Cross-check: a single-row array of the same 12 modules halves the rail
to `1*2*41.04 = ` **82 LF** and the clamps to 22 mid / 4 end -- the row count multiplies every quantity.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar"]`, inside the `// Group A` solar block beside `pv-row-spacing`) -- the
Group A citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (rail = rows
x rails x run; mid = rails x rows x (modules-1), `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned
example plus the single-row cross-check); `test/fixtures/compute-map.js` (`pv-rail-clamp-takeoff` ->
`computePvRailClampTakeoff`, module `../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `pv-row-spacing` /
`pv-ballast-weight` / `metal-weight`); `data/search/aliases.json` (5 collision-checked aliases: "pv rail takeoff",
"solar racking clamps", "module clamp count", "solar rail splice", "pv mounting hardware"); a hand-written renderer in
the `SOLAR_RENDERERS` map mirroring a count renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-solar declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the run length, rail footage, clamp and splice
counts, and the error seams (non-positive rows, modules, width, rails, stock; negative gap). The calc-solar.js gzip cap is
watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from
home first paint. Home tile count 1,344 -> 1,345.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group A audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2*2*(12*3.42) -> 164 LF rail, 44 mid clamps).

## 5. Roadmap position

Opens the solar install-ops vein beside `pv-row-spacing`, serving the solar installer (solar), and pairs with the coming
`pv-ballast-weight`. Stays evidence-driven; the rack manufacturer's engineering governs.
