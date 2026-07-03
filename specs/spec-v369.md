# roughlogic.com Specification v369 -- Brick Veneer Anchor Spacing and Count (TMS 402 / IBC 1405) (calc-masonry.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v368..v370 (the masonry loading/detailing trio -- wall dead
> load (v368), the brick-veneer anchor spacing (this spec), the lintel arching load (v370)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: anchored brick veneer is tied back to its backup by
> corrugated or wire anchors on a prescribed maximum spacing and wall area per anchor -- the TMS 402 / IBC 1405 rule a mason
> and an inspector lay out to. The catalog sizes masonry members and takes off units but has no veneer-anchor tile. Adds one
> tile to the existing **`calc-masonry.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v368.md.
>
> **The gap, and the evidence for it.** TMS 402 Chapter 12 (and IBC 1405.6) limit anchored veneer to one anchor per a
> maximum wall area -- `2.67 ft^2` for the common prescriptive case (higher in high-wind/seismic where it tightens to
> `2.0 ft^2`) -- with maximum spacings of 32 in horizontally and about 25 in (often detailed at 24 in, one course module)
> vertically. The anchor count for a wall is `ceil(area / area_per_anchor)`, and the layout must also satisfy the spacing
> caps. For a 200 ft^2 veneer at the `2.67 ft^2` limit, `ceil(200/2.67) = 75 anchors` -- on a roughly 16 in horizontal by
> 24 in vertical grid (`16 x 24/144 = 2.67 ft^2`), the standard brick-tie pattern. Tighten to the `2.0 ft^2` high-demand
> limit and it takes 100 anchors. This is the tie schedule a submittal shows; the member tiles never touch it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The veneer area is an area
(ft^2); the maximum area per anchor is an area (ft^2); the maximum horizontal and vertical spacings are lengths (in); the
anchor count is a dimensionless count; the implied grid spacing is a length (in). The v18/v21 contract: any non-finite
input, or an area or area-per-anchor at or below zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the TMS 402 / IBC veneer-anchor provisions by name; `editionNote` names **the TMS 402-16 Ch. 12 /
IBC 1405.6 anchored-veneer limits -- one anchor per 2.67 ft^2 (reduced to 2.0 ft^2 where the wind or seismic provisions
require), maximum 32 in horizontal and ~25 in (commonly 24 in) vertical spacing -- and the count `= ceil(area/area_per_anchor)`**,
and states that **this returns the anchor count and layout grid for anchored brick veneer -- it uses the entered maximum
area per anchor (pick 2.67 or the reduced value per the governing wind/seismic provision) and checks the spacing caps, and
does not size the anchor itself (gauge/embedment), the air gap, or the flashing/weeps; and this is a layout aid, not a
substitute for the engineer of record and the AHJ** -- the adopted code edition and the authority having jurisdiction
govern.

## 2. The tile

### 2.1 `brick-veneer-anchor-spacing` -- Brick Veneer Anchor Spacing and Count (TMS 402 / IBC)

```
inputs:
  area_ft2       ft^2   veneer wall area
  area_per       ft^2   maximum wall area per anchor (2.67 default; 2.0 high-demand)
  max_horiz_in   in     maximum horizontal spacing (default 32)
  max_vert_in    in     maximum vertical spacing (default 24)

anchors = ceil(area_ft2 / area_per)                ; anchor count
grid_ft2 = area_ft2 / anchors                       ; achieved area per anchor
; verify a horizontal x vertical grid <= (max_horiz, max_vert) meets area_per
```

**Pinned worked example (a 200 ft^2 veneer, 2.67 ft^2 per anchor).**
`anchors = ceil(200/2.67) = 75`; a 16 in x 24 in grid gives `16 x 24/144 = 2.67 ft^2` per anchor, within the 32 in / 24 in
spacing caps -- the standard brick-tie pattern. **Cross-check (a high-wind wall at the 2.0 ft^2 limit).** `area_per = 2.0`:
`anchors = ceil(200/2.0) = 100` -- a third more anchors, on a tighter ~16 in x 18 in grid, the density the wind provisions
force. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry","construction"]`, matching the masonry tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the TMS 402 / IBC veneer-anchor provisions, `editionNote`
naming the 2.67/2.0 ft^2 limits, the 32 in / 24 in spacings, the count formula, and the not-anchor-sizing, AHJ-governs
caveats); `test/fixtures/worked-examples.json` (the 2.67 example + the 2.0 high-demand cross-check);
`test/fixtures/compute-map.js` (`brick-veneer-anchor-spacing` -> `computeBrickVeneerAnchorSpacing` in
`../../calc-masonry.js`); `scripts/related-tiles.mjs` (-> `masonry-count` / `masonry-wall-weight` / `masonry-coursing` /
`wind-cc-pressure`); `data/search/aliases.json` ("brick veneer anchors", "veneer tie spacing", "brick tie count", "TMS
402 veneer", "IBC 1405 veneer", "masonry anchor spacing", "brick tie pattern", "2.67 square feet anchor", "veneer anchor
layout"); the id appended to the existing masonry renderers block in `app.js`; the `// dims:` annotation (areas area,
spacings length, anchors dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the ceil count, the grid-spacing check, and the non-positive / non-finite error seams. No new module; re-pin
`calc-masonry.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the count assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the anchor count / grid stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (200 ft^2 at 2.67 -> 75 anchors).

## 5. Roadmap position

Middle of the masonry loading/detailing batch (v368..v370) in `calc-masonry.js`, adding the veneer-tie layout to the wall-
weight tile. The lintel arching load (v370) follows. An anchor-gauge/embedment sizing from the wind-load demand, a
seismic-provision auto-selection of the reduced area, and a chain from `wind-cc-pressure` for the anchor design load are
the deliberate next follow-ons once the trio lands.
