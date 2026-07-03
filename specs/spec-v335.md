# roughlogic.com Specification v335 -- Roadway Superelevation and Minimum Curve Radius (AASHTO) (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v335..v337 (the roadway geometric-design trio -- the sight-
> and-safety numbers the curve-layout tiles never give: the superelevation and minimum radius of a horizontal curve (this
> spec), the minimum vertical-curve length for stopping sight distance (v336), and the horizontal sightline offset to see
> around a curve (v337).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `horizontal-curve` lays out a curve's geometry
> (tangent, length, chord), but not the superelevation (banking) it needs to hold a design speed, or the minimum radius a
> speed and bank allow. That AASHTO point-mass relation is the safety half of curve design. Adds one tile to the existing
> **`calc-civil.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v334.md.
>
> **The gap, and the evidence for it.** The AASHTO point-mass model balances a vehicle on a curve with the superelevation
> rate `e` and the side-friction factor `f`: `e + f = V^2/(15 R)`, with `V` in mph and `R` in ft. Solving for the required
> superelevation, `e = V^2/(15 R) - f`, and for the minimum radius at a maximum bank, `R_min = V^2/(15(e_max + f))`. For a
> 60 mph curve of `R = 1,500 ft` with a design `f = 0.12`, `e = 3,600/(15 x 1,500) - 0.12 = 0.24 - 0.12 = 0.04` (a 4% bank);
> and at a maximum `e = 0.08`, the sharpest allowable radius is `R_min = 3,600/(15 x 0.20) = 1,200 ft`. These set the bank a
> contractor builds and the tightest curve a design speed permits -- the numbers `horizontal-curve` assumes are already
> chosen. This tile chooses them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The design speed `V` is a
speed (mph); the radius `R` is a length (ft); the superelevation rate `e` and side-friction factor `f` are dimensionless
(decimal, e.g. 0.08 = 8%). The v18/v21 contract: any non-finite input, or a speed, radius, or `(e + f)` at or below zero,
returns `{ error }`; a negative required `e` (a curve flat enough that side friction alone holds it) is reported as such.
Citation discipline (v19/v22): `GOVERNANCE.general` over the AASHTO point-mass curve model by name; `editionNote` names
**the AASHTO Green Book point-mass relation `e + f = V^2/(15 R)`, the required superelevation `e = V^2/(15 R) - f`, the
minimum radius `R_min = V^2/(15(e_max + f))`, and that the side-friction factor `f` decreases with design speed (about 0.16
at 30 mph to 0.08 at 80 mph)**, and states that **this returns the point-mass superelevation and minimum radius -- it uses
the entered design side-friction factor (from the AASHTO speed table), does not distribute `e` and `f` by an AASHTO method
(1 through 5) over the speed range, and does not size the superelevation transition/runoff length or the spiral; and this
is a design aid, not a substitute for a licensed civil engineer's geometric design** -- the engineer of record and the
governing roadway design manual (AASHTO / state DOT) govern.

## 2. The tile

### 2.1 `superelevation` -- Roadway Superelevation and Minimum Curve Radius (AASHTO)

```
inputs:
  V_mph    mph    design speed
  R_ft     ft     curve radius (for required e); OR
  e_max    -      maximum superelevation rate (for minimum radius)
  f        -      side-friction factor (from the AASHTO speed table)

e_req  = V_mph^2 / (15 * R_ft) - f                    ; required superelevation (mode 1)
R_min  = V_mph^2 / (15 * (e_max + f))                 ; minimum radius (mode 2)
```

**Pinned worked example (a 60 mph curve, R = 1,500 ft, f = 0.12).** `e_req = 60^2/(15 x 1,500) - 0.12 = 0.24 - 0.12 = 0.04`
-- a 4% superelevation. And the sharpest curve at a 60 mph design with `e_max = 0.08`, `f = 0.12`:
`R_min = 3,600/(15 x 0.20) = 1,200 ft`. **Cross-check (a flatter curve needs no bank).** At `R = 3,000 ft`,
`e_req = 3,600/45,000 - 0.12 = 0.08 - 0.12 = -0.04` -- negative, meaning side friction alone holds the vehicle and a normal
crown suffices; the tile reports "no superelevation required" rather than a negative bank. The non-finite and non-positive
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["surveying","civil"]`, matching `horizontal-curve`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the AASHTO point-mass model, `editionNote` naming `e + f = V^2/(15 R)`,
`e = V^2/(15 R) - f`, `R_min = V^2/(15(e_max + f))`, the `f`-vs-speed trend, and the point-mass, no-runoff, no-spiral
caveats); `test/fixtures/worked-examples.json` (the banked example + the no-bank cross-check);
`test/fixtures/compute-map.js` (`superelevation` -> `computeSuperelevation` in `../../calc-civil.js`);
`scripts/related-tiles.mjs` (-> `horizontal-curve` / `vertical-curve-sight-distance` / `horizontal-sightline-offset` /
`stopping-sight-distance`); `data/search/aliases.json` ("superelevation", "road banking", "minimum curve radius", "AASHTO
curve", "e plus f", "side friction factor", "curve design speed", "banking a curve", "V squared over 15R"); the id appended
to the existing civil renderers block in `app.js`; the `// dims:` annotation (`V` speed, `R` length, `e`/`f` dimensionless);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the two modes, the negative-`e`
no-bank case, and the non-positive / non-finite error seams. No new module; re-pin `calc-civil.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the two-mode and no-bank assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `e_req` / `R_min` outputs wrap on a
phone); render-no-nan + a11y sweep, output read to the value (60 mph, R 1,500 -> e 0.04; R_min 1,200 ft).

## 5. Roadmap position

Opens the roadway geometric-design batch (v335..v337) in `calc-civil.js`, adding curve superelevation to the layout tiles.
The vertical-curve sight distance (v336) and the horizontal sightline offset (v337) follow. The AASHTO `e`-distribution
methods, the superelevation runoff/transition length, and a spiral-transition tile are the deliberate next follow-ons once
the trio lands.
