# roughlogic.com Specification v214 -- Wallcovering Roll Takeoff With Pattern Repeat (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v212..v214 (masonry and finish -- the gaps the catalog's
> two-tile masonry shelf left: grouted-cell volume, modular coursing, wallcovering rolls). This closes the
> v212..v214 finish batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: wallcovering is hung by painters and
> paperhangers. Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency.
> Inherits spec.md through spec-v213.md.
>
> **The gap, and the evidence for it.** The catalog covers paint by area (`paint-coverage`) and DFT
> (`coating-coverage-dft`), but wallcovering is not an area buy -- it is a strip buy, and the killer variable
> is the pattern repeat. You cut full-height strips across the perimeter, but every strip wastes up to one
> pattern repeat to match the run, so a large-repeat paper can need nearly double the rolls a same-area solid
> would. Area-over-coverage (the way you would estimate paint) systematically under-orders patterned paper,
> which is the classic mid-job shortfall. The catalog can paint a wall but cannot paper it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The wall
perimeter, the wall height, the roll width, the roll length, and the pattern repeat are a length (`L`, in);
the strips needed, the strips per roll, and the rolls are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive perimeter / height / roll width / roll length, a negative repeat, or a
pattern repeat plus wall height exceeding the roll length (no full strip fits) returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the strips-and-rolls relations by name; `editionNote` names
the **wallcovering industry estimating** practice (the strip method and the one-repeat-per-strip waste rule)
and states that **the roll dimensions are the product's stated bolt size (single/double/Euro rolls vary), door
and window openings are a manual strip credit, and this is a material takeoff, not a hang plan** -- an
ordering aid, not an installation layout.

## 2. The tile

### 2.1 `wallpaper-rolls` -- Rolls From Perimeter, Height, and Pattern Repeat

```
inputs:
  perimeter_in  L   total wall run to cover, in (room perimeter less full-height openings)
  height_in     L   wall height, in
  roll_width_in L   roll width, in   (Euro ~20.5, American ~27)
  roll_len_in   L   roll length, in  (Euro single ~396 = 33 ft)
  repeat_in     L   pattern repeat, in (0 = random/free match)

strips_needed   = ceil(perimeter_in / roll_width_in)
strip_len_in    = height_in + repeat_in            # one repeat wasted per strip to match
strips_per_roll = floor(roll_len_in / strip_len_in)
rolls           = ceil(strips_needed / strips_per_roll)
```

**Pinned worked example (Euro roll, modest repeat).** A 12 ft x 14 ft room, 9 ft (108 in) ceilings,
perimeter 624 in, 20.5 in roll width, 396 in roll length, 19 in repeat: `strips_needed = ceil(624 / 20.5) =
ceil(30.4) = 31`; `strip_len = 108 + 19 = 127 in`; `strips_per_roll = floor(396 / 127) = 3`; `rolls = ceil(31
/ 3) = ceil(10.33) = ` **11 rolls**.
**Cross-check (large drop-match repeat).** Same room and roll, but a 25 in pattern repeat: `strip_len = 108 +
25 = 133 in`; `strips_per_roll = floor(396 / 133) = 2`; `rolls = ceil(31 / 2) = ` **16 rolls**. The bigger
repeat drops the yield from three strips per roll to two and pushes the order from 11 to 16 rolls for the same
walls -- the area is identical; the repeat is what costs.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["coatings","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the strips-and-rolls relations, `editionNote` naming the
wallcovering estimating practice and the bolt-size / opening-credit caveats);
`test/fixtures/worked-examples.json` (modest-repeat example + large-repeat cross-check);
`test/fixtures/compute-map.js` (`wallpaper-rolls` -> `computeWallpaperRolls` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `paint-coverage` / `square-footage` / `flooring-takeoff`);
`data/search/aliases.json` ("wallpaper", "wallcovering", "wallpaper rolls", "pattern repeat", "paperhanger
estimate", "wallpaper calculator"); the id appended to the existing construction renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples and error seams (non-finite, dimensions <= 0, negative repeat, repeat+height >
roll length). Raise the `calc-construction.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the no-repeat path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the strips / per-roll /
rolls stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (624 in / 108 in / 19 in
repeat -> 11 rolls).

## 5. Roadmap position

Closes the v212..v214 finish batch (CMU grout, masonry coursing, wallcovering). Pairs with `paint-coverage`
as the other interior-finish takeoff. A border / mural strip-count sub-mode is a deliberate future follow-on.
