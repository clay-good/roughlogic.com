# roughlogic.com Specification v514 -- Brake Pedal Ratio and Line Pressure (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v513.md.
>
> **The gap, and the evidence for it.** `brake-pad-life` estimates wear, but nothing in the bench connects the driver's
> leg to the clamp at the rotor -- the pedal ratio, the master-cylinder bore, and the caliper area that together decide
> whether a pedal is firm or goes to the floor. This is Pascal's law end to end, and the catch that surprises builders
> is the master-cylinder bore: because pressure is force over area, **doubling the master-cylinder bore quarters the line
> pressure** for the same leg effort. That is the whole manual-versus-boosted trade -- a big-bore master needs a booster
> or a hard leg, a small-bore master makes pressure easily but needs more pedal travel. The tile takes the pedal force,
> the pedal ratio, an optional booster factor, the master-cylinder bore, the caliper piston area, the pad friction, and
> the rotor effective radius, and returns the line pressure, the caliper clamp, and the brake torque -- the numbers that
> tell a builder whether a brake system will actually stop the car.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pedal and clamp forces
are forces (`M L T^-2`, in lb); the master-cylinder bore and rotor radius are lengths (`L`, in inches); the master-
cylinder and caliper areas are areas (`L^2`); the line pressure is a stress (`M L^-1 T^-2`, in psi); the brake torque is
`M L^2 T^-2` (in in-lb); the pedal ratio, booster factor, and friction coefficient are `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive pedal force, pedal ratio, master-cylinder bore, caliper area, or rotor
radius, or a negative friction coefficient returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over
the hydraulic brake relations by name (Pascal's law; SAE brake-system design practice); `editionNote` names the
**hydraulic brake force chain (Pascal's law)**, prints `mc_force = pedal_force x ratio x booster`,
`line_pressure = mc_force / mc_area`, `clamp = line_pressure x caliper_area`, and
`brake_torque = clamp x 2 x friction x rotor_radius`, and states that **doubling the master-cylinder bore quarters the
line pressure for the same leg effort (area scales with the square of the bore), the factor of 2 in the torque accounts
for both pad faces, a bigger master makes less pressure but moves more fluid (firmer-but-heavier vs softer-but-easier),
and the actual pad friction, thermal state, and system compliance govern** -- a design aid, not a validated brake
system.

## 2. The tile

### 2.1 `brake-pedal-hydraulic` -- Why Doubling the Master-Cylinder Bore Quarters the Pressure

```
inputs:
  pedal_force_lb     lb    force applied at the pedal pad
  pedal_ratio        -     pedal mechanical advantage (pivot geometry)
  booster_factor     -     brake-booster multiplication (1.0 = manual)
  mc_bore_in         in    master-cylinder bore diameter
  caliper_area_in2   in2   total caliper piston area (per corner)
  pad_friction       -     pad-to-rotor coefficient of friction (~0.4)
  rotor_radius_in    in    effective (mean) rotor radius

mc_force     = pedal_force_lb x pedal_ratio x booster_factor            [lb]
mc_area      = pi / 4 x mc_bore_in^2                                    [in^2]
line_psi     = mc_force / mc_area                                       [psi]
clamp_lb     = line_psi x caliper_area_in2                              [lb]
brake_torque = clamp_lb x 2 x pad_friction x rotor_radius_in           [in-lb]
```

**Pinned worked example (50 lb pedal, 5:1 ratio, manual, 7/8 in master, 4 in^2 caliper, 0.4 pad, 4.5 in rotor).**
`mc_force = 50 x 5 x 1 = 250 lb`; `mc_area = pi/4 x 0.875^2 = 0.601 in^2`, so the line pressure is
`250 / 0.601 = ` **416 psi**; the clamp is `416 x 4 = ` **1,663 lb**; and the brake torque is
`1663 x 2 x 0.4 x 4.5 = ` **5,987 in-lb** per corner. **Cross-check (a bigger master kills the pressure).** Swap to a
`1.75 in` master (double the bore): `mc_area = pi/4 x 1.75^2 = 2.405 in^2`, so `line_pressure = 250 / 2.405 = ` **104
psi** -- exactly a **quarter** of the pressure for the identical leg effort, which is why that big-bore master needs a
booster or a much harder push to stop the car. The tile returns the line pressure, the clamp, and the brake torque.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 7/8 in master example + the
double-bore cross-check); `test/fixtures/compute-map.js` (`brake-pedal-hydraulic` -> `computeBrakePedalHydraulic` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `brake-pad-life` / `wheel-offset-backspacing` /
`bolt-proof-load`); `data/search/aliases.json` ("brake pedal ratio", "brake line pressure", "master cylinder bore",
"brake clamp force", "pascal law brakes", "brake torque", "manual vs power brakes", "caliper clamp"); the id appended to
the mechanic renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the bore-squared pressure relation (the quartering), the two-pad
torque factor, and the error seams (non-finite, non-positive pedal / ratio / bore / caliper / radius, negative
friction). Hand-writes its renderer (mirroring the calc-mechanic.js `brake-pad-life` pattern). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the pressure / clamp / torque stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 7/8 in master example -> 416 psi, 5,987 in-lb).

## 5. Roadmap position

Adds the brake hydraulic chain beside `brake-pad-life` (the wear side). A pedal-travel / fluid-volume companion (does
the master move enough fluid to fill the calipers), a front-rear bias (balance-bar) helper, and a stopping-distance-
from-brake-torque tie-in are deliberate future follow-ons. Further Group K growth stays evidence-driven.
