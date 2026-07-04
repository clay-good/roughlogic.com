# roughlogic.com Specification v438 -- Flooring Plank Layout and Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of an interior-finish takeoff trio (v438 flooring plank -> v439 insulation batt
> -> v440 trim linear footage). `tile-count` counts tile and grout; plank flooring (LVP, laminate, hardwood) is laid out
> differently -- by plank, box, and row -- and no tile does it.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Plank flooring is ordered by the box and laid in rows,
> so the takeoff is the floor area plus a waste allowance divided by the plank area for the plank count, divided by the
> box coverage for the box count, and the room width divided by the plank width for the number of rows. `tile-count` handles
> square tile and grout, not plank layout. This adds the plank tile to the existing **`calc-construction.js`** module
> (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v437.md.
>
> **The gap, and the evidence for it.** A `300 ft^2` room floored with `6 in` by `48 in` planks (`2.0 ft^2` each) at a `10%`
> waste allowance needs `300 * 1.10 = 330 ft^2` of material, which is `330 / 2.0 = 165` planks or `ceil(330 / 24) = 14` boxes
> (at `24 ft^2/box`). Across a `15 ft` (`180 in`) room width, `180 / 6 = 30` rows of plank run wall to wall. No tile does
> this; a flooring installer had the area but not the plank, box, or row counts.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The floor area is an area
(ft^2); the plank width and length are lengths (in); the waste allowance is dimensionless (percent); the box coverage is an
area (ft^2); the room width is a length (ft); the plank, box, and row counts are dimensionless. The v18/v21 contract: any
non-finite input, or a non-positive area, plank dimension, or box coverage, returns `{ error }`; the plank and box counts
are rounded up, and the row count and last-row plank width are reported when a room width is given. Citation discipline
(v19/v22): `GOVERNANCE.general` over the plank flooring takeoff by name; `editionNote` names **the plank area
`= width_in * length_in / 144`, the material with waste `= area * (1 + waste)`, the plank count `= material / plank_area`,
the box count `= material / box_coverage`, and the rows `= room_width / plank_width` (typical `7 to 10%` waste, more for
diagonal or herringbone)**, and states that **this returns the plank, box, and row counts for a plank floor, that pattern
and layout affect waste, and that it is a takeoff aid, not a substitute for a measured layout plan**.

## 2. The tile

### 2.1 `flooring-plank-layout` -- Flooring Plank Layout and Takeoff

```
inputs:
  area_ft2         ft^2   floor area
  plank_w_in       in     plank width
  plank_l_in       in     plank length
  waste_pct        %      waste allowance (default 10)
  box_coverage_ft2 ft^2   coverage per box
  room_width_ft    ft     room width across the planks (optional)

plank_area = plank_w_in * plank_l_in / 144
material   = area_ft2 * (1 + waste_pct/100)
planks     = ceil(material / plank_area)
boxes      = ceil(material / box_coverage_ft2)
rows       = ceil(room_width_ft * 12 / plank_w_in)
```

**Pinned worked example (300 ft^2, 6 in x 48 in plank, 10% waste, 24 ft^2/box, 15 ft width).** plank area `2.0 ft^2`;
material `330 ft^2`; `planks = 165`; `boxes = 14`; `rows = 180/6 = 30`. **Cross-check (diagonal layout, more waste).** At
`15%` waste the material rises to `345 ft^2` and the box count to `15` -- the extra cuts of a diagonal or herringbone run. A
non-positive area, plank dimension, or box coverage takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["flooring", "carpentry"]`, beside `tile-count` / `square-footage`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, plank flooring takeoff, `editionNote` naming the
plank-area, waste, plank/box/row relations); `test/fixtures/worked-examples.json` (the 10% example + the 15% cross-check);
`test/fixtures/compute-map.js` (`flooring-plank-layout` -> `computeFlooringPlankLayout` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `tile-count` / `square-footage` / `insulation-batt-coverage` / `material-quantity`);
`data/search/aliases.json` ("flooring plank", "lvp calculator", "plank flooring", "vinyl plank layout", "hardwood floor
boxes", "laminate flooring", "flooring boxes", "plank count", "floor waste"); the id appended to the existing construction
renderers block in `app.js`; the `// dims:` annotation (area area, plank dims length, waste dimensionless, counts
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the box/plank
rounding, and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the rounding, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the planks / boxes / rows set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (300 ft^2, 6x48 -> 165 planks, 14 boxes).

## 5. Roadmap position

Opens the interior-finish takeoff trio: `insulation-batt-coverage` (v439) and `trim-linear-footage` (v440) round out the
finish materials. A starter-row and last-row cut-width calculator and an underlayment/transition-strip companion are the
deliberate next follow-ons.
