# roughlogic.com Specification v455 -- Bend Deduction and Setback (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the fabrication-layout trio (v453 intermittent fillet weld ->
> v454 multi-bend flat pattern -> v455 bend deduction). `bend-allowance` outputs the bend allowance and the total flat length
> from a neutral-axis K-factor; this tile gives the flange-referenced numbers a brake operator actually marks -- the outside
> setback and the bend deduction -- and feeds the multi-bend flat pattern.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A press-brake operator lays out a part from the mold
> line, not the neutral axis, so the numbers that matter are the outside setback `OSSB = (R + T) * tan(theta/2)` and the bend
> deduction `BD = 2*OSSB - BA`, where `BA` is the bend allowance. `bend-allowance` gives `BA` and a single flat length but
> never the setback or the deduction the operator marks and that `multi-bend-flat-pattern` sums. This adds the tile to the
> existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v454.md.
>
> **The gap, and the evidence for it.** A `90 deg` bend at `R = 0.125 in` inside radius in `T = 0.0625 in` material
> (`K = 0.44`) has a bend allowance `BA = (pi/180)*90*(0.125 + 0.44*0.0625) = 0.2395 in`, an outside setback
> `OSSB = (0.125 + 0.0625)*tan(45) = 0.1875 in`, and a bend deduction `BD = 2*0.1875 - 0.2395 = 0.1355 in`. The operator
> marks each flange from the mold line by the setback and pulls `0.1355 in` out of the blank per bend. No tile does this;
> `bend-allowance` gave `BA` but not the setback or deduction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The thickness, inside radius,
bend allowance, outside setback, and bend deduction are lengths (in); the bend angle is an angle (deg, handled
dimensionlessly per the v14 no-`angle`-base rule); the K-factor is dimensionless. The v18/v21 contract: any non-finite
input, or a non-positive thickness or radius, or a bend angle outside `(0, 180)`, returns `{ error }`; the tile reports the
bend allowance, the outside setback, and the bend deduction. Citation discipline (v19/v22): `GOVERNANCE.general` over the
press-brake bend deduction by name; `editionNote` names **the Machinery's Handbook / SMACNA press-brake geometry, the bend
allowance `BA = (pi/180)*theta*(R + K*T)`, the outside setback `OSSB = (R + T)*tan(theta/2)`, the bend deduction
`BD = 2*OSSB - BA`, and the K-factor (about `0.33` to `0.5`, `~0.44` typical) as the neutral-axis position**, and states
that **this returns the flange-referenced setback and deduction a brake operator marks, that these feed the multi-bend flat
pattern, and that it is a layout aid, not a substitute for a test bend to confirm the K-factor**.

## 2. The tile

### 2.1 `bend-deduction-setback` -- Bend Deduction and Setback

```
inputs:
  thickness_in     in   material thickness T
  inside_radius_in in   inside bend radius R
  bend_angle_deg   deg  bend angle theta
  k_factor         -    neutral-axis K-factor (default 0.44)

BA   = (pi/180) * bend_angle_deg * (inside_radius_in + k_factor * thickness_in)
OSSB = (inside_radius_in + thickness_in) * tan(bend_angle_deg/2 in radians)
BD   = 2 * OSSB - BA
```

**Pinned worked example (90 deg, R 0.125 in, T 0.0625 in, K 0.44).** `BA = 0.2395 in`; `OSSB = 0.1875 in`;
`BD = 2*0.1875 - 0.2395 = 0.1355 in`. **Cross-check (a sharper acute bend).** A `60 deg` bend at the same radius and
thickness gives a smaller `OSSB = (0.1875)*tan(30) = 0.1083 in` and `BD = 0.0470 in` -- less material pulled out at a
gentler bend. A bend angle outside `(0, 180)`, or a non-positive thickness/radius, takes the error path; the non-finite seam
is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `bend-allowance`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, press-brake bend deduction, `editionNote` naming the `BA`, `OSSB`, and `BD`
relations and the K-factor); `test/fixtures/worked-examples.json` (the 90 deg example + the 60 deg cross-check);
`test/fixtures/compute-map.js` (`bend-deduction-setback` -> `computeBendDeductionSetback` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `bend-allowance` / `multi-bend-flat-pattern` / `min-bend-radius` / `press-brake-tonnage`);
`data/search/aliases.json` ("bend deduction", "setback bend", "OSSB", "outside setback", "bend deduction sheet metal",
"press brake setback", "mold line bend", "BD calculation", "bend deduction K factor"); the id appended to the existing
construction renderers block in `app.js`; the `// dims:` annotation (thickness/radius/BA/OSSB/BD length, angle/K
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `BD`
relation, and the angle-range / non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the angle-range check, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the BA / OSSB / BD set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (90 deg, R 0.125, T 0.0625 -> BD 0.1355 in).

## 5. Roadmap position

Closes the fabrication-layout trio: v453 the intermittent weld, v454 the flat pattern, and v455 the per-bend deduction that
feeds it. A K-factor-from-a-test-bend back-solver and a spring-back over-bend companion are the deliberate next follow-ons.
