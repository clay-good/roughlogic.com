# roughlogic.com Specification v457 -- Ceiling Speaker Coverage and Spacing (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-04). Second tile of the low-voltage systems trio (v456 camera lens FOV -> v457 ceiling speaker
> coverage -> v458 structured cabling channel). `speaker-70v-line` handles the amplifier tap loading and `spl-distance` the
> level, but neither lays out the ceiling grid -- the coverage diameter and spacing that decide how many speakers a room
> needs for even sound.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A ceiling loudspeaker throws a cone of coverage; at
> listener ear height that cone is a circle of diameter `2 * (ceiling_height - ear_height) * tan(coverage_angle / 2)`.
> Spacing the speakers edge-to-edge covers economically, while the tighter minimum-overlap (2:1) spacing gives even sound;
> the count is the room area divided by the spacing squared. No tile lays out the grid. This adds the coverage tile to the
> existing **`calc-lowvoltage.js`** module (Group A); no new group, trade, or dependency. Inherits spec.md through
> spec-v456.md.
>
> **The gap, and the evidence for it.** A `10 ft` ceiling over seated listeners (`4 ft` ear height) with `90 deg` speakers
> throws a coverage circle of `2 * (10 - 4) * tan(45) = 12 ft` diameter. Spacing at that `12 ft` edge-to-edge, a
> `1200 ft^2` room needs `ceil(1200 / 12^2) = 9` speakers; the tighter minimum-overlap spacing (`~8.5 ft`) would call for
> more but sound smoother. No tile does this; a designer had the tap-loading tile but not the layout.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ceiling and ear heights
are lengths (ft); the coverage angle is an angle (deg, handled dimensionlessly); the coverage diameter and spacing are
lengths (ft); the room area is an area (ft^2); the speaker count is dimensionless. The v18/v21 contract: any non-finite
input, or a ceiling at or below ear height, or a coverage angle outside `(0, 180)`, or a non-positive area, returns
`{ error }`; the tile reports the coverage diameter, the edge-to-edge and minimum-overlap spacings, and the speaker count at
the chosen spacing. Citation discipline (v19/v22): `GOVERNANCE.general` over the ceiling loudspeaker layout by name;
`editionNote` names **the coverage circle diameter `2 * (ceiling - ear) * tan(coverage_angle/2)`, the edge-to-edge spacing
(equal to the diameter, economy), the minimum-overlap (2:1) spacing (about `0.7 *` diameter, even coverage), the count
`area / spacing^2`, and the typical `~90 deg` conical coverage angle**, and states that **this returns the ceiling-speaker
grid layout, that coverage angle is frequency-dependent (the `-6 dB` angle is used), and that it is a design aid, not a
substitute for an acoustic model**.

## 2. The tile

### 2.1 `ceiling-speaker-coverage` -- Ceiling Speaker Coverage and Spacing

```
inputs:
  ceiling_ft        ft    ceiling height
  ear_ft            ft    listener ear height (seated ~4, standing ~5)
  coverage_deg      deg   speaker coverage angle (~90 typical)
  room_area_ft2     ft^2  room area
  layout            -     edge_to_edge | minimum_overlap

diameter = 2 * (ceiling_ft - ear_ft) * tan(coverage_deg/2 in radians)
spacing  = layout == "minimum_overlap" ? 0.7 * diameter : diameter
count    = ceil(room_area_ft2 / spacing^2)
```

**Pinned worked example (10 ft ceiling, 4 ft ear, 90 deg, 1200 ft^2, edge-to-edge).** coverage diameter
`2 * 6 * tan(45) = 12 ft`; spacing `12 ft`; `count = ceil(1200 / 144) = 9`. **Cross-check (even coverage needs more).** At
minimum-overlap spacing `0.7 * 12 = 8.4 ft`, `count = ceil(1200 / 70.6) = 17` -- smoother sound, more speakers. A ceiling at
or below ear height, or a non-positive area, takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage"]`, beside `speaker-70v-line` / `spl-distance`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, distributed-audio ceiling layout, `editionNote` naming the
coverage-diameter, spacing, and count relations and the coverage-angle note); `test/fixtures/worked-examples.json` (the
edge-to-edge example + the minimum-overlap cross-check); `test/fixtures/compute-map.js` (`ceiling-speaker-coverage` ->
`computeCeilingSpeakerCoverage` in `../../calc-lowvoltage.js`); `scripts/related-tiles.mjs` (-> `speaker-70v-line` /
`spl-distance` / `camera-lens-fov` / `amp-power-spl`); `data/search/aliases.json` ("ceiling speaker coverage", "speaker
spacing", "ceiling speaker layout", "distributed audio", "speaker count room", "ceiling speaker grid", "70v speaker
spacing", "speaker coverage angle", "how many ceiling speakers"); the id appended to the existing low-voltage renderers
block in `app.js`; the `// dims:` annotation (heights/diameter/spacing length, angle dimensionless, area area, count
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the spacing
modes, and the ceiling-vs-ear / non-positive / non-finite error seams. No new module; re-pin `calc-lowvoltage.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the spacing modes, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the diameter / spacing / count set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (10 ft ceiling, 90 deg -> 12 ft coverage, 9 speakers).

## 5. Roadmap position

The middle of the low-voltage systems trio: `camera-lens-fov` (v456) and `structured-cabling-channel` (v458) bracket it. A
square vs hexagonal grid layout and a per-speaker wattage tie-in to `speaker-70v-line` are the deliberate next follow-ons.
