# roughlogic.com Specification v469 -- Sliding Snow Load on a Lower Roof (ASCE 7 7.9) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the snow-load-provisions trio (v468 rain-on-snow surcharge -> v469 sliding
> snow -> v470 minimum roof snow). Snow sliding off an upper roof piles onto the lower roof below it; `snow-drift-load` covers
> the wind-driven leeward drift, but the sliding surcharge is a separate load ASCE 7 §7.9 adds, and no tile computes it.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Where a sloped upper roof sheds onto a lower roof, the
> snow that slides off adds a surcharge. ASCE 7 §7.9 sets the total sliding load at `0.4 * pf * W` (pounds per foot of shared
> width), where `pf` is the upper roof's flat snow load and `W` its horizontal eave-to-ridge length, distributed uniformly
> over a `15 ft` width from the upper roof's eave (or the full lower-roof width if less than `15 ft`, giving a higher
> intensity). `snow-drift-load` is the wind drift, not the slide. This adds the sliding tile to the existing
> **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v468.md.
>
> **The gap, and the evidence for it.** An upper roof with a `20 psf` flat snow load and a `40 ft` eave-to-ridge run sheds a
> total sliding load of `0.4 * 20 * 40 = 320 lb per ft` of width; spread over the `15 ft` sliding zone that is
> `320 / 15 = 21.3 psf` added to the lower roof's own snow over that strip. If the lower roof is only `10 ft` wide, the same
> `320 lb/ft` concentrates into `32 psf`. No tile does this; a designer had the drift but not the slide.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The upper-roof flat snow load
is a pressure (psf); the eave-to-ridge length and the lower-roof width are lengths (ft); the total sliding load is a line
load (lb/ft) and the surcharge intensity a pressure (psf). The v18/v21 contract: any non-finite input, or a non-positive
snow load or length, returns `{ error }`; the total sliding load is `0.4*pf*W`, distributed over the lesser of `15 ft` and
the lower-roof width, and the tile reports the total line load and the surcharge intensity. Citation discipline (v19/v22):
`GOVERNANCE.general` over the ASCE 7 sliding snow by name; `editionNote` names **ASCE 7 §7.9, the total sliding load
`0.4 * pf * W` per foot of width (`pf` the upper roof flat snow, `W` its horizontal eave-to-ridge length), distributed over
a `15 ft` width from the upper eave (or the full lower-roof width if narrower), and that it is superimposed on the lower
roof's balanced snow**, and states that **this returns the sliding snow surcharge on a lower roof, that it applies to
slippery and non-slippery upper roofs above a slope threshold, and that it is a design aid, not a substitute for the
engineer of record**.

## 2. The tile

### 2.1 `sliding-snow-load` -- Sliding Snow Load on a Lower Roof (ASCE 7 7.9)

```
inputs:
  pf_upper_psf     psf   upper roof flat snow load
  eave_ridge_ft    ft    upper roof horizontal eave-to-ridge length W
  lower_width_ft   ft    lower roof width available (default 15)

total_lb_ft = 0.4 * pf_upper_psf * eave_ridge_ft
dist_width  = min(15, lower_width_ft)
surcharge_psf = total_lb_ft / dist_width
```

**Pinned worked example (upper pf 20 psf, W 40 ft, lower roof >= 15 ft).** total `0.4*20*40 = 320 lb/ft`; over `15 ft` that
is `320/15 = 21.3 psf` of surcharge on the lower roof. **Cross-check (a narrow lower roof concentrates it).** A `10 ft`-wide
lower roof spreads the same `320 lb/ft` over `10 ft` for `32 psf` -- a narrower catch roof sees a heavier surcharge. A
non-positive snow load or length takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `snow-drift-load` / `snow-load`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASCE 7 §7.9, `editionNote` naming the
`0.4*pf*W` total, the `15 ft` distribution width, and the superimposed note); `test/fixtures/worked-examples.json` (the
15 ft example + the narrow-roof cross-check); `test/fixtures/compute-map.js` (`sliding-snow-load` -> `computeSlidingSnowLoad`
in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `snow-load` / `snow-drift-load` / `rain-on-snow-surcharge`
/ `minimum-roof-snow`); `data/search/aliases.json` ("sliding snow", "sliding snow load", "asce 7.9", "snow slide roof",
"lower roof snow", "0.4 pf W", "snow surcharge lower roof", "roof snow sliding", "snow on lower roof"); the id appended to
the existing construction renderers block in `app.js`; the `// dims:` annotation (snow load pressure, lengths length, total
line load, surcharge pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the distribution-width switch, and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js`
on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the distribution switch, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the total / surcharge output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (pf 20, W 40 -> 320 lb/ft, 21.3 psf).

## 5. Roadmap position

The middle of the snow-load-provisions trio: `rain-on-snow-surcharge` (v468) and `minimum-roof-snow` (v470) bracket it. An
upper-roof-slope threshold check (whether sliding applies) is the deliberate next follow-on.
