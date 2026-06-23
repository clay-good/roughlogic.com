# roughlogic.com Specification v202 -- Reducer Centerline Offset and Invert Continuity (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v199..v203 (plumbing/pipefitting -- hydronic radiant,
> condensate return, and three fabrication/process layout tiles).** In-scope catalog expansion under the
> spec-v106 trades-only charter: the reducer-layout tile that decides whether the invert or the centerline
> stays continuous through a size change. Adds one tile to **`calc-pipefit.js`** (Group B); no new module,
> group, or dependency. Inherits spec.md through spec-v201.md.
>
> **The gap, and the evidence for it.** A reducer is in every line that changes size, and the layout
> question is never trivial: a **concentric** reducer keeps the centerlines aligned but drops the invert
> by half the diameter change -- a dam on a gravity drain and an air pocket on a pump suction. An
> **eccentric** reducer keeps one side flat: flat-on-bottom holds the invert continuous (correct on a
> sewer), flat-on-top holds the crown continuous (correct on a pump suction, to clear air). The fitter
> needs the centerline offset and which surface stays continuous for each type, and the catalog computes
> bolt torque for a flange but nothing for the reducer the flange bolts to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The large
and small outside diameters, the centerline offset, the lay length, and the resulting bottom-of-pipe and
top-of-pipe shifts are a length (`L`, in); the reducer type is an enumerated flag
(`concentric` / `eccentric-flat-bottom` / `eccentric-flat-top`). The v18/v21 contract: any non-finite
input, a non-positive diameter, or a small OD at or above the large OD returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the offset and continuity relations by name; `editionNote`
names **ASME B16.9** for the standard lay lengths (the bundled values; a user override is allowed for a
non-standard reducer) and states that **the flat-on-bottom orientation holds the invert and the
flat-on-top holds the crown** -- the practice that keeps a drain self-cleaning and a pump suction free of
air. The lay length is a fitting dimension, not a code minimum.

## 2. The tile

### 2.1 `reducer-offset` -- Centerline Offset, Lay Length, and Continuous Surface

```
inputs:
  large_od_in   L   large-end outside diameter, in
  small_od_in   L   small-end outside diameter, in   (guarded: < large_od_in)
  lay_length_in L   end-to-end lay length, in (default from the bundled B16.9 table by size pair)
  type = "concentric" | "eccentric-flat-bottom" | "eccentric-flat-top"

centerline_offset = (large_od_in - small_od_in) / 2        # eccentric: centerline shifts this much
# concentric:            centerline continuous; BOP rises by offset, TOP drops by offset
# eccentric-flat-bottom: BOP (invert) continuous; centerline and TOP shift down by offset
# eccentric-flat-top:    TOP (crown) continuous;  centerline and BOP shift up   by offset
```

**Pinned worked example.** A 6 x 4 reducer (large OD 6.625, small OD 4.5), B16.9 lay length 7 in:
`centerline_offset = (6.625 - 4.5) / 2 = ` **1.0625 in**. As **eccentric flat-on-bottom** on a gravity
drain the invert runs straight through (no dam) and the centerline drops 1.0625 in; as **concentric** the
centerline runs straight but the invert rises 1.0625 in at the small end -- a dam that holds solids.
**Cross-check (smaller pair, smaller offset).** A 4 x 3 reducer (OD 4.5 -> 3.5), lay length 5 in:
`offset = (4.5 - 3.5) / 2 = 0.50 in`. The offset is always half the OD difference; the type decides which
of invert, centerline, or crown stays continuous.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting","plumbing"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the offset and continuity relations, `editionNote` naming ASME
B16.9 and the flat-bottom-holds-invert / flat-top-holds-crown practice);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`reducer-offset` -> `computeReducerOffset` in `../../calc-pipefit.js`); `scripts/related-tiles.mjs`
(-> `drainage-invert` / `pipe-fitting-takeout` / `flange-bolt-torque`); `data/search/aliases.json`
("eccentric reducer", "concentric reducer", "reducer offset", "flat on top", "flat on bottom",
"pump suction reducer"); the id appended to the existing pipefit renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, the cross-check, all three type branches, and error seams (non-finite, diameter <= 0,
`small_od >= large_od`). Raise the `calc-pipefit.js` size cap by ~20 percent if needed (dated comment).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the three type branches); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the offset and the
continuity note wrap on a phone); render-no-nan + a11y sweep, output read to the value (6 x 4 -> 1.0625 in
offset, flat-bottom holds invert).

## 5. Roadmap position

Pairs with `drainage-invert` (the reducer is where a graded run changes size without a dam) and with the
fabrication-layout tiles. A reducing-branch saddle and a concentric/eccentric cone-development template
stay evidence-driven follow-ons.
