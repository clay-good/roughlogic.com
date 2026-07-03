# roughlogic.com Specification v319 -- Ballnose Milling Scallop Height from Stepover (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.112.0; proposed 2026-07-02). Batch spec-v317..v319 (the machining depth trio -- radial chip thinning
> (v317), boring-bar deflection (v318), the ballnose scallop height (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `turning-surface-finish` gives the theoretical finish
> from feed and nose radius for turning, but 3D and mold work is done with a ballnose end mill, whose finish is set by the
> stepover between parallel passes -- the scallop (cusp) left standing between them. The catalog has no ballnose-scallop
> tile. Adds one tile to the existing **`calc-machining.js`** module (Group K); no new group, trade, or dependency. Inherits
> spec.md through spec-v318.md.
>
> **The gap, and the evidence for it.** A ballnose cutter of radius `R` stepping over by `s` between adjacent passes leaves
> a scallop of height `h = R - sqrt(R^2 - (s/2)^2)`, or the inverted form for the stepover that holds a target scallop,
> `s = 2 sqrt(R^2 - (R - h)^2)`. For a 0.5 in ballnose (`R = 0.25 in`) at a 0.030 in stepover, `h = 0.25 - sqrt(0.0625 - 0.000225) = 0.00045 in`
> (0.45 mil) -- a fine finish; double the stepover to 0.060 in and the scallop quadruples to `0.0018 in`, since near the
> bottom `h ~ s^2/(8R)`. This is the trade-off a mold or aerospace machinist makes every toolpath: a tighter stepover buys
> a finer finish at the cost of cycle time. `turning-surface-finish` handles the lathe; this tile handles the ballnose.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ballnose radius `R`, the
stepover `s`, and the scallop height `h` are lengths (in, reported also in mil/micro-in); the mode selects
scallop-from-stepover or stepover-from-scallop. The v18/v21 contract: any non-finite input, a radius at or below zero, or a
stepover exceeding the cutter diameter (`s > 2R`) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the scallop geometry by name; `editionNote` names **the ballnose scallop height `h = R - sqrt(R^2 - (s/2)^2)` and its
inverse `s = 2 sqrt(R^2 - (R - h)^2)`, with the small-scallop approximation `h ~ s^2/(8R)`, as compiled in the CAM / mold-
machining references**, and states that **this returns the theoretical scallop between parallel passes on a flat surface --
it is the geometric cusp (a sloped surface changes the effective stepover, and tool deflection and runout add to the real
finish), assumes a true ballnose radius, and does not cover the cusp along the feed direction (that is the feed/`turning-
surface-finish` geometry) or convert to `Ra`; and this is a shop aid** -- the actual finish depends on the tool, deflection,
and surface slope.

## 2. The tile

### 2.1 `ballnose-scallop-height` -- Ballnose Milling Scallop Height from Stepover

```
inputs:
  R_in     in     ballnose radius (cutter diameter / 2)
  mode     -      scallop-from-stepover | stepover-from-scallop
  s_in     in     stepover (mode 1)
  h_in     in     target scallop height (mode 2)

mode 1: h = R_in - sqrt(R_in^2 - (s_in/2)^2)               ; scallop height, in
mode 2: s = 2 * sqrt(R_in^2 - (R_in - h_in)^2)             ; stepover, in
(approx near the bottom: h ~ s^2/(8 R))
```

**Pinned worked example (a 0.5 in ballnose, 0.030 in stepover).** `R = 0.25`, `s = 0.030`:
`h = 0.25 - sqrt(0.0625 - 0.00015^2... = 0.0625 - (0.015)^2 = 0.0625 - 0.000225) = 0.25 - 0.24955 = 0.00045 in` (0.45 mil),
matching the approximation `s^2/(8R) = 0.0009/2 = 0.00045`. **Cross-check (double the stepover, and the inverse).** At
`s = 0.060 in`, `h = 0.25 - sqrt(0.0625 - 0.0009) = 0.0018 in` -- four times the scallop for twice the stepover (the
`s^2` law). Running the inverse, a target `h = 0.00045 in` returns `s = 2 sqrt(0.25^2 - (0.25 - 0.00045)^2) = 0.030 in`,
closing the loop. The non-finite, non-positive, and `s > 2R` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist","mechanic"]`, matching `turning-surface-finish`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the scallop geometry, `editionNote` naming
`h = R - sqrt(R^2 - (s/2)^2)`, the inverse, the `s^2/(8R)` approximation, and the flat-surface, geometric-only, not-Ra
caveats); `test/fixtures/worked-examples.json` (the 0.030 example + the double-stepover-and-inverse cross-check);
`test/fixtures/compute-map.js` (`ballnose-scallop-height` -> `computeBallnoseScallopHeight` in
`../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `turning-surface-finish` / `radial-chip-thinning` /
`boring-bar-deflection` / `cutting-speed-rpm`); `data/search/aliases.json` ("scallop height", "ballnose stepover", "cusp
height", "3D milling finish", "stepover for finish", "ball end mill scallop", "surface finish milling", "mold machining
stepover", "scallop calculator"); the id appended to the existing machining renderers block in `app.js`; the `// dims:`
annotation (`R`/`s`/`h` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the forward/inverse round-trip, the `s^2` scaling, and the `s > 2R` / non-positive / non-finite error seams. No new module;
re-pin `calc-machining.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the forward/inverse round-trip assertion); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `h` in in/mil and the mode
output wrap on a phone); render-no-nan + a11y sweep, output read to the value (0.5 in ballnose, 0.030 stepover -> 0.45 mil).

## 5. Roadmap position

Closes the machining depth batch (v317..v319) in `calc-machining.js`: chip thinning, tool deflection, and the ballnose
scallop now stand beside the speeds/feeds, MRR, power, and turning-finish tiles. The sloped-surface effective-stepover
correction, an `Ra`-from-scallop estimate, and a cycle-time-versus-finish trade chart into `machining-time` are the
deliberate next follow-ons once the trio lands.
