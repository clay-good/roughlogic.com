# roughlogic.com Specification v642 -- Hydraulic Pump Output Flow (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/hydraulics), no new module, group, or dependency. Inherits spec.md through spec-v641.md.
>
> **The gap, and the evidence for it.** The fluid-power cluster ships the motor (`hydraulic-motor-torque-speed`,
> calc-mechanic.js, whose speed line is `rpm = 231 x gpm / disp x vol_eff`), the cylinder
> (`hydraulic-cylinder-force-speed`, calc-cross.js), and the pump power sizer (`hydraulic-pump-horsepower`) -- but
> the pump *flow* itself is missing. `hydraulic-pump-horsepower` even takes the delivered `gpm` as a given input
> without a tile to produce it. The delivered flow is the exact algebraic inverse of the motor speed relation:
> theoretical flow `Q = disp x rpm / 231` (231 in^3 per gallon), delivered `Q x vol_eff`. The pinned example: a
> 2.0 in^3/rev pump at 1800 rpm and 0.95 volumetric efficiency displaces **15.58 gpm** but delivers **14.81 gpm** --
> the **0.78 gpm** difference is internal slip that grows with pressure and wear.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The displacement is
`L^3`, the drive speed is `T^-1`, the volumetric efficiency is `dimensionless`, and the three flows are
`L^3 T^-1`. The `231 in^3/gal` constant is exact and already appears verbatim in the sibling motor tile. The
v18/v21 contract: any non-finite input, a non-positive displacement or speed, or a volumetric efficiency outside
`(0, 1]` returns `{ error }`. Citation discipline (v19/v22): the fluid-power displacement-flow relation by name;
the note states that **theoretical flow = disp x rpm / 231, delivered = theoretical x volumetric efficiency, this
is the inverse of the hydraulic-motor speed relation, and the delivered gpm is exactly the input the
hydraulic-pump-horsepower tile takes** -- a sizing aid, not a substitute for the pump manufacturer's data.

## 2. The tile

### 2.1 `hydraulic-pump-flow` -- The Flow a Hydraulic Pump Delivers

```
inputs:
  disp_in3   in^3/rev   pump displacement per revolution (> 0)
  rpm        rpm        drive speed (> 0)
  vol_eff    -          volumetric efficiency (0 < ve <= 1; ~0.90-0.95 gear/vane)

q_theo   = disp_in3 x rpm / 231           [gpm]   (231 in^3 per gallon)
q_actual = q_theo x vol_eff               [gpm]
q_slip   = q_theo - q_actual              [gpm]
```

**Pinned worked example.** disp = 2.0 in^3/rev, rpm = 1800, vol_eff = 0.95:
`q_theo = 2.0 x 1800 / 231 = ` **15.58 gpm**, `q_actual = 15.58 x 0.95 = ` **14.81 gpm**, slip **0.78 gpm**.
**Cross-check (exact inverse of the motor tile).** Feed the theoretical flow into the motor speed relation at
`vol_eff = 1`: `rpm = 231 x 15.58 / 2.0 = ` **1800 rpm** -- the pump-flow and motor-speed tiles are exact inverses.
(The fuzzer runs this round-trip through the actual `computeHydraulicMotorTorqueSpeed` and recovers 1800 to 1e-9.)

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic", "hydraulics"]`, beside `hydraulic-motor-torque-speed`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (fluid-power displacement flow, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the motor round-trip); `test/fixtures/compute-map.js`
(`hydraulic-pump-flow` -> `computeHydraulicPumpFlow`); `scripts/related-tiles.mjs` (<-> `hydraulic-pump-horsepower`,
`hydraulic-motor-torque-speed`, `hydraulic-cylinder`, `cooling-system-flow`); `data/search/aliases.json` ("hydraulic
pump flow", "pump displacement to gpm", "pump slip", plus question rows, all collision-checked);
`MECHANIC_RENDERERS["hydraulic-pump-flow"]` via the `_simpleRenderer` factory (field DOM ids = the input keys) and
the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the linear rpm/displacement
scaling, the exact motor round-trip, and the error seams. The `MECHANIC_RENDERERS: 7 ids` test is a spot-check of
named ids, not a total-count assertion, so no test edit is needed. The two `index.html` home-count spots go
1,090 -> 1,091 (check-readme-counts gates them). The calc-mechanic.js gzip cap is expected to hold (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 14.81 gpm delivered, 15.58 theoretical, 0.78 slip).

## 5. Roadmap position

Completes the fluid-power pump/motor pair: the motor (flow -> speed) and now the pump (speed -> flow), exact
inverses through the same `231 x gpm / disp x vol_eff` relation, and the delivered flow flows straight into
`hydraulic-pump-horsepower`. Further Group K growth stays evidence-driven.
