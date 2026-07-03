# roughlogic.com Specification v357 -- Weld Passes and Arc Time to Fill a Groove (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v356..v358 (the welding-process trio -- dilution (v356), the
> passes and arc time to fill a groove (this spec), the travel speed for a target heat input (v358)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `weld-metal-volume` gives the volume of weld metal a
> groove needs and `wire-feed-deposition` gives the deposition rate, but neither combines them into the two numbers a shop
> schedules by -- the number of passes and the arc-on time to fill the joint. Adds one tile to the existing **`calc-fab.js`**
> module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v356.md.
>
> **The gap, and the evidence for it.** The number of passes is the groove cross-section divided by what one pass deposits,
> `passes = ceil(A_groove / a_pass)`, and the arc-on time is the weld-metal weight divided by the deposition rate,
> `arc_time = (A_groove x length x density) / deposition_rate` (steel density `0.283 lb/in^3`). For a 12 in weld with a
> `0.15 in^2` groove, a `0.03 in^2` deposit per pass, and an 8 lb/h deposition rate, that is `ceil(0.15/0.03) = 5 passes`,
> a weld-metal weight of `0.15 x 12 x 0.283 = 0.51 lb`, and `0.51/8 = 0.064 h = 3.8 min` of arc time -- the pass count that
> sets the WPS and the arc time that (with an operator factor) sets the labor estimate. The volume tile gives the fill; this
> tile turns it into passes and minutes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The groove and per-pass areas
are areas (in^2); the weld length is a length (in); the weld-metal weight is a force (lb); the deposition rate is a mass per
time (lb/h); the passes are a dimensionless count; the arc time is a time (h, min). The v18/v21 contract: any non-finite
input, or an area, length, or deposition rate at or below zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the fill-passes/arc-time relations by name; `editionNote` names **the passes
`= ceil(A_groove/a_pass)`, the weld-metal weight `= A_groove x length x density` (steel `0.283 lb/in^3`), the arc time
`= weight/deposition_rate`, and that the total shop time is the arc time divided by an operator/duty factor (~30-60% for
manual), as compiled in the AWS/Lincoln welding-cost references**, and states that **this returns the fill passes and arc-on
time -- it uses a uniform per-pass area (real passes vary; root/hot/fill/cap differ) and the entered deposition rate (from
`wire-feed-deposition`), gives arc-on time (divide by the operator factor for total labor), and does not add joint prep,
tacking, or a reinforcement cap; and this is a production aid** -- the qualified WPS and shop practice govern.

## 2. The tile

### 2.1 `weld-passes-arc-time` -- Weld Passes and Arc Time to Fill a Groove

```
inputs:
  A_groove   in^2    groove (weld) cross-sectional area
  length_in  in      weld length
  a_pass     in^2    weld-metal area deposited per pass
  dep_rate   lb/h    deposition rate (from wire-feed-deposition)
  density    lb/in^3 weld-metal density (default 0.283 steel)
  op_factor  -       operator/duty factor (optional, for total time)

passes = ceil(A_groove / a_pass)
weight = A_groove * length_in * density                     ; lb
arc_h  = weight / dep_rate                                   ; arc-on time, h
total_h = arc_h / op_factor                                  ; total time (if op_factor given)
```

**Pinned worked example (a 12 in weld, 0.15 in^2 groove, 0.03 in^2/pass, 8 lb/h).**
`passes = ceil(0.15/0.03) = 5`; `weight = 0.15 x 12 x 0.283 = 0.509 lb`; `arc_time = 0.509/8 = 0.064 h = 3.8 min`. At a
40% operator factor, the total shop time is `3.8/0.40 = 9.5 min`. **Cross-check (a bigger 0.30 in^2 groove).**
`passes = ceil(0.30/0.03) = 10`; `weight = 0.30 x 12 x 0.283 = 1.02 lb`; `arc_time = 1.02/8 = 0.127 h = 7.6 min` -- double
the groove doubles the passes and the arc time, the linear scaling that makes weld-metal volume the driver of welding cost.
The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","fabrication"]`, matching `weld-metal-volume`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the fill-passes/arc-time relations, `editionNote` naming
`passes = ceil(A_groove/a_pass)`, `weight = A_groove x length x density`, `arc = weight/dep_rate`, the operator factor, and
the uniform-pass, arc-on-only caveats); `test/fixtures/worked-examples.json` (the base example + the bigger-groove cross-
check); `test/fixtures/compute-map.js` (`weld-passes-arc-time` -> `computeWeldPassesArcTime` in `../../calc-fab.js`);
`scripts/related-tiles.mjs` (-> `weld-metal-volume` / `wire-feed-deposition` / `weld-cost-per-foot` / `weld-dilution`);
`data/search/aliases.json` ("weld passes", "number of weld passes", "arc time", "weld fill time", "groove fill passes",
"welding time estimate", "deposition arc time", "weld metal weight", "passes to fill"); the id appended to the existing fab
renderers block in `app.js`; the `// dims:` annotation (areas area, length length, weight force, `dep_rate` mass/time,
passes dimensionless, times time); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the ceil passes, the weight and arc-time relations, the operator-factor total, and the non-positive / non-finite
error seams. No new module; re-pin `calc-fab.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the passes/arc-time assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `passes` / `weight` / `arc_time`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (0.15 in^2 groove, 12 in -> 5 passes, 3.8
min).

## 5. Roadmap position

Middle of the welding-process batch (v356..v358) in `calc-fab.js`, turning weld volume into passes and time. The travel
speed for a target heat input (v358) follows. A per-pass-type (root/fill/cap) breakdown, an operator-factor library by
process, and a full weld-labor-cost chain into `weld-cost-per-foot` are the deliberate next follow-ons once the trio lands.
