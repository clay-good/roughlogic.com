# roughlogic.com Specification v613 -- Paddle Flocculator Power From Geometry (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, the water/wastewater treatment bench); no new module, group, or dependency. Inherits spec.md through
> spec-v612.md.
>
> **The gap, and the evidence for it.** Spec-v575 (`flocculation-g-value`) names this tile as a deliberate follow-on:
> "a paddle-power-from-geometry helper (computing P from the paddle drag and speed)." The G-value tile needs the power
> input P as a given; on a paddle-wheel flocculator that power is not metered, it is the drag the paddles do against
> the water, and the operator or designer has to compute it from the wheel geometry. The relation is Newtonian drag:
> `P = 0.5 x Cd x rho x A x v_rel^3`, the paddle area times the cube of its velocity relative to the water. The two
> subtleties the tile exists to make explicit are the **cube** and the **slip**: the power goes with the cube of the
> relative velocity, so a small speed change swings the power hard, and the water does not sit still -- it rotates with
> the paddles at a slip fraction k, so the relative velocity is only `(1 - k)` of the paddle tip speed, and ignoring the
> slip over-states the power by roughly a factor of two. Both the drag coefficient (about 1.8 for a long flat blade,
> 1.0 to 1.8 in the literature) and the slip factor (about 0.25, 0.25 to 0.40 reported) are entered by the user because
> the references genuinely disagree; the drag physics is exact once they are chosen. A six-foot paddle wheel at three
> revolutions per minute with forty square feet of blade delivers about **267 watts** into the basin -- the number that
> then goes straight into `flocculation-g-value` for the mixing gradient.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The paddle radius is
`L` (ft), the wheel speed a rotational rate carried `dimensionless` (rpm), the paddle blade area `L^2` (ft^2), the tip
and relative velocities `L T^-1` (ft/s), and the power `M L^2 T^-3` (ft-lb/s, W, hp); the drag coefficient and slip
factor are `dimensionless`, all carried dimensionless to the parse-only lint alongside the `flocculation-g-value`
sibling. Water density is the standard 1.937 slug/ft^3. The v18/v21 contract: any non-finite input, a non-positive
paddle radius, wheel speed, or blade area, a drag coefficient at or below zero, or a slip factor outside 0 to 1
(exclusive of 1) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the Camp paddle-power
drag relation by name (water-treatment design practice, matching the `flocculation-g-value` sibling); `editionNote`
prints `v_tip = 2 x pi x radius x rpm / 60`, `v_rel = v_tip x (1 - k)`, and
`P = 0.5 x Cd x 1.937 x area x v_rel^3` (ft-lb/s, x 1.35582 for W, / 550 for hp), and states that **the power goes as
the cube of the relative velocity so a small speed change swings it hard, the water slips (rotates with the paddles) so
the relative velocity is only (1 - k) of the tip speed and ignoring the slip roughly doubles the power, the drag
coefficient (about 1.8, 1.0 to 1.8 reported) and slip factor (about 0.25, 0.25 to 0.40 reported) are user inputs
because the references disagree, this power feeds `flocculation-g-value` for the mixing gradient, and the flocculator
design and the operator govern** -- a design aid, not a metered power.

## 2. The tile

### 2.1 `flocculator-paddle-power` -- Paddle-Wheel Drag Power From Geometry

```
inputs:
  paddle_radius_ft   ft      radius to the paddle-blade centroid
  wheel_rpm          rpm     paddle-wheel rotational speed
  paddle_area_ft2    ft2     total paddle-blade area
  drag_coeff         --      blade drag coefficient Cd (about 1.8; 1.0-1.8 reported)
  slip_factor        --      water slip factor k (about 0.25; 0.25-0.40 reported)

v_tip_fps = 2 x pi x paddle_radius_ft x wheel_rpm / 60          [ft/s]
v_rel_fps = v_tip_fps x (1 - slip_factor)                        [ft/s]
power_ftlbs = 0.5 x drag_coeff x 1.937 x paddle_area_ft2 x v_rel_fps^3   [ft-lb/s]
power_w  = power_ftlbs x 1.35582                                 [W]
power_hp = power_ftlbs / 550                                     [hp]
```

**Pinned worked example (a 6-ft paddle wheel, 3 rpm, 40 ft^2 of blade, Cd 1.8, slip 0.25).**
`v_tip = 2 x pi x 6 x 3 / 60 = ` **1.885 ft/s**, `v_rel = 1.885 x 0.75 = ` **1.414 ft/s**, so
`P = 0.5 x 1.8 x 1.937 x 40 x 1.414^3 = ` **197 ft-lb/s = 267 W** (0.36 hp) -- the number that feeds
`flocculation-g-value`. Had the slip been ignored (k = 0), the relative velocity would be the full 1.885 ft/s and the
power `0.5 x 1.8 x 1.937 x 40 x 1.885^3 = 467 W`, nearly double, the classic over-estimate. **Cross-check (a 5-ft
wheel, 4 rpm, 30 ft^2, Cd 1.5, slip 0.30).** `v_tip = 2 x pi x 5 x 4 / 60 = 2.094 ft/s`,
`v_rel = 2.094 x 0.70 = 1.466 ft/s`, `P = 0.5 x 1.5 x 1.937 x 30 x 1.466^3 = ` **137 ft-lb/s = 186 W** (0.25 hp) --
confirming the cube law, the faster wheel doing more work per blade even at a smaller area and lower Cd.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water-treatment"]`, placed inside the `// Group M: Water` comment block
beside `flocculation-g-value` -- the `citations.test.js` **Group M audit count bumps 29 -> 30**); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`flocculator-paddle-power` ->
`computeFlocculatorPaddlePower` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `flocculation-g-value`
/ `coagulant-dose` / `detention-time`); `data/search/aliases.json` ("paddle power", "flocculator power", "paddle
flocculator", "camp paddle power", "flocculation power", plus question rows); the id appended to the calc-treatment
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the cube-law and slip behavior, and the error seams (non-finite,
non-positive radius / rpm / area / Cd, slip out of 0-1). Renderer hand-written (mirroring the calc-treatment tiles),
computing directly in US units and reporting W and hp. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group M audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 6-ft example ->
267 W).

## 5. Roadmap position

Supplies the power `flocculation-g-value` requires, computed from paddle geometry, beside `coagulant-dose` and
`detention-time`. The v575-named tapered-flocculation multi-stage G schedule remains a deliberate future follow-on.
Further Group M growth stays evidence-driven.
