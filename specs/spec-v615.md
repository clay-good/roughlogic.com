# roughlogic.com Specification v615 -- Three-Point Bridle Leg Tension (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z, rigging and heavy lift); no new module, group, or dependency. Inherits spec.md through spec-v614.md.
>
> **The gap, and the evidence for it.** Spec-v544 (`bridle-leg-tension`) names this tile as a deliberate follow-on:
> "a three-point (pick-and-two-bridle) resolution," and its own citation flags the boundary -- "this is a static
> two-dimensional resolution (a three-point bridle or out-of-plane geometry differs)." Arena rigging hangs points
> from **three** beams whenever the load has to land between beam lines in both directions, and the two-leg tile
> cannot resolve it: three legs pull out of plane, and the split depends on the full 3-D geometry. The statics are
> still exact and closed-form -- three unit vectors from the apex to the attachment points, three unknown tensions,
> and the 3x3 equilibrium `sum Ti ui = (0, 0, W)` solved by Cramer's rule. The two catches the tile makes explicit:
> the solution is only physical while **every** tension comes out positive (a rope can only pull -- the apex must
> hang horizontally inside the triangle of its attachment points), and a symmetric-looking hang is rarely an equal
> split (a 1,000 lb load on the verified asymmetric example splits 497 / 419 / 244 lb -- the near legs carry twice
> the far one). The tile returns each leg's length, angle, and tension, and errors on the slack-leg geometry.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The apex load and the
leg tensions are forces (`M L T^-2`, in lb); the east / north / rise offsets and the computed leg lengths are
lengths (`L`, ft); the angles (degrees above horizontal) are `dimensionless`. The v18/v21 contract: any non-finite
input, a non-positive load, a non-positive rise on any leg (every leg must go up), a coplanar / degenerate geometry
(the 3x3 determinant vanishes -- the three legs and the load cannot balance), or any solved tension at or below
zero (the apex hangs horizontally outside the triangle of attachment points, so one leg would have to push) returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.rigging` over the bridle statics by name (entertainment
rigging three-point bridle geometry, static 3-D resolution); `editionNote` prints `Li = sqrt(e^2 + n^2 + rise^2)`,
`ui = (e, n, rise) / Li`, and `T1 u1 + T2 u2 + T3 u3 = (0, 0, W)` solved by Cramer's rule, and states that **the
solution is physical only while every leg tension is positive (a rope can only pull; the apex must hang inside the
triangle of its attachment points), an asymmetric hang splits the load far from evenly, and the hardware ratings
and a qualified rigger govern** -- a design aid, not a rigging sign-off.

## 2. The tile

### 2.1 `three-point-bridle` -- Leg Tensions of a 3-D Three-Point Bridle

```
inputs:
  apex_load_lb  lb   load hung at the bridle apex (acts straight down)
  e1_ft n1_ft r1_ft  ft   leg 1 offsets from apex to its attachment point: east, north, rise (up)
  e2_ft n2_ft r2_ft  ft   leg 2 offsets
  e3_ft n3_ft r3_ft  ft   leg 3 offsets

Li      = sqrt(ei^2 + ni^2 + ri^2)              [ft]
ui      = (ei, ni, ri) / Li                     [-]   unit vector along leg i
solve     T1 u1 + T2 u2 + T3 u3 = (0, 0, W)     (Cramer's rule; error if det ~ 0 or any Ti <= 0)
anglei  = asin(ri / Li)                          [deg above horizontal]
```

**Pinned worked example (the symmetric check).** A 1,200 lb load on three legs 120 degrees apart, each 6 ft out and
8 ft up (points (6, 0, 8), (-3, 5.196, 8), (-3, -5.196, 8)): every leg is 10 ft at 53.13 degrees and carries exactly
`T = W / (3 x 0.8) = ` **500 lb** -- the symmetric closed form `W / (3 sin angle)` recovered by the general solver.
**Cross-check (the asymmetric hang, python-verified).** 1,000 lb with leg 1 to (5, 0, 10), leg 2 to (-4, 3, 8),
leg 3 to (-2, -6, 9): lengths 11.18 / 9.43 / 11.0 ft, angles 63.4 / 58.0 / 54.9 degrees, and the tensions split
`T1 = ` **496.9 lb**, `T2 = ` **419.3 lb**, `T3 = ` **244.4 lb** -- nothing close to an even 333 each. A load whose
apex sits horizontally outside the attachment triangle (for example all three points east of the apex) solves with
a negative tension and returns the slack-leg error instead of a number.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging", "stage"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.rigging`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`three-point-bridle` -> `computeThreePointBridle` in `../../calc-rigging.js`);
`scripts/related-tiles.mjs` (-> `bridle-leg-tension` / `multi-leg-sling` / `sling-angle`);
`data/search/aliases.json` ("three point bridle", "three leg bridle", "3 leg bridle tension", "bridle apex
triangle", "arena rigging bridle", plus question rows); `RIGGING_RENDERERS["three-point-bridle"]` appended at the
file end and the id added to the rigging declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the vertical
equilibrium residual, the symmetric closed form, and the error seams (non-finite, non-positive load / rise,
coplanar geometry, apex outside the triangle). Hand-writes its renderer with the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers (mirroring `bridle-leg-tension`). The
calc-rigging.js gzip cap sits near 98% -- expect a raise (21000 -> ~24000) with the CHANGELOG note per the
check-module-sizes convention. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (three leg-output lines wrap on a phone); render + output read to the value
(the symmetric example -> 500 lb per leg).

## 5. Roadmap position

Completes the bridle pair spec-v544 opened: `bridle-leg-tension` resolves the in-plane two-leg case, this tile the
out-of-plane three-point case, beside `multi-leg-sling` (the symmetric shared-load rule). The v544-named beam-clamp
/ horizontal-reaction capacity check remains a deliberate future follow-on. Further Group Z growth stays
evidence-driven.
