# roughlogic.com Specification v453 -- Intermittent Fillet Weld Schedule (AISC J2 / AWS) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a fabrication-layout trio (v453 intermittent fillet weld -> v454 multi-bend
> flat pattern -> v455 bend deduction). `fillet-weld-strength` gives a continuous weld's capacity; when the required weld is
> smaller than the practical minimum, welders stitch an intermittent schedule instead, and this tile sizes the increment and
> pitch to match the continuous strength.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A light continuous weld is often replaced by a larger
> intermittent (stitch) weld welded over only part of the length. To match a continuous weld of size `w_req` with an
> intermittent weld of size `w`, weld a fraction `w_req/w` of the length, so the pitch (center to center) is
> `P = increment / (w_req/w)`. AISC J2.2b requires each increment be at least `4 * w`, and never less than `1.5 in`. Nothing
> in the catalog schedules an intermittent weld. This adds the tile to the existing **`calc-construction.js`** module
> (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v452.md.
>
> **The gap, and the evidence for it.** A `3/16 in` continuous fillet is required, but the thinner plate's minimum practical
> weld is `5/16 in`; welding at that size, only `(3/16)/(5/16) = 60%` of the length is needed. With a `3 in` increment the
> pitch is `3 / 0.60 = 5 in` center to center (weld `3 in`, skip `2 in`, repeat), and the `3 in` increment clears the
> `max(4*5/16, 1.5) = 1.5 in` minimum. No tile does this; a fabricator sizing a stitch weld worked the percentage and the
> minimum by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The weld sizes and the
increment and pitch are lengths (in); the percentage is dimensionless. The v18/v21 contract: any non-finite input, or a
non-positive weld size or increment, or a required size larger than the intermittent size (an intermittent weld cannot be
weaker than the continuous it replaces), returns `{ error }`; the tile reports the percent of length to weld, the pitch, and
whether the increment meets the `max(4*w, 1.5 in)` minimum. Citation discipline (v19/v22): `GOVERNANCE.general` over the
intermittent fillet weld by name; `editionNote` names **AISC 360 J2.2b / AWS D1.1, the strength-match fraction
`w_req / w_intermittent`, the pitch `P = increment / fraction`, the minimum increment `= greater of 4*weld size or 1.5 in`,
and the maximum longitudinal spacing limits (J3.5 / E6)**, and states that **this returns the intermittent weld increment
and pitch for a target continuous strength, that maximum-spacing and end-return rules also apply, and that it is a design
aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `intermittent-fillet-weld` -- Intermittent Fillet Weld Schedule (AISC J2 / AWS)

```
inputs:
  w_req_in       in   required continuous fillet size
  w_intermit_in  in   intermittent (stitch) fillet size (>= w_req)
  increment_in   in   weld increment length

fraction  = w_req_in / w_intermit_in
pitch_in  = increment_in / fraction
min_incr  = max(4 * w_intermit_in, 1.5)
ok        = increment_in >= min_incr
```

**Pinned worked example (3/16 in required, 5/16 in stitch, 3 in increment).** `fraction = 0.60` (weld `60%` of length);
`pitch = 3 / 0.60 = 5.0 in`; `min increment = max(4*5/16, 1.5) = 1.5 in`, and the `3 in` increment clears it. **Cross-check
(tighter schedule).** A `2 in` increment gives a `2/0.60 = 3.33 in` pitch, still above the `1.5 in` minimum -- shorter
stitches, closer spacing, same total weld. A required size larger than the stitch size, or a non-positive input, takes the
error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding"]`, beside `fillet-weld-strength` / `steel-fillet-weld-size`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, AISC J2.2b intermittent fillet, `editionNote`
naming the fraction, pitch, and minimum-increment relations); `test/fixtures/worked-examples.json` (the 3 in example + the
2 in cross-check); `test/fixtures/compute-map.js` (`intermittent-fillet-weld` -> `computeIntermittentFilletWeld` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `fillet-weld-strength` / `steel-fillet-weld-size` /
`weld-metal-volume` / `weld-cost-per-foot`); `data/search/aliases.json` ("intermittent fillet weld", "stitch weld", "weld
increment pitch", "skip weld", "intermittent weld spacing", "stitch welding", "weld pitch", "aisc intermittent weld",
"intermittent weld schedule"); the id appended to the existing construction renderers block in `app.js`; the `// dims:`
annotation (sizes/increment/pitch length, fraction dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the minimum-increment check, and the size-order / non-positive /
non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the minimum-increment check, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the percent / pitch output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (3/16 req, 5/16 stitch, 3 in -> 60%, 5.0 in pitch).

## 5. Roadmap position

Opens the fabrication-layout trio: `multi-bend-flat-pattern` (v454) and `bend-deduction-setback` (v455) cover sheet-metal
layout. A maximum-longitudinal-spacing (J3.5) check and an end-return-length companion are the deliberate next follow-ons.
