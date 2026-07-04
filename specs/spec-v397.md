# roughlogic.com Specification v397 -- Hydraulic Motor Torque and Speed (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.139.0; proposed 2026-07-03). Second tile of the fluid-power / cooling trio (v396 pump drive HP -> v397 hydraulic motor
> torque and speed -> v398 cooling-system coolant flow). `hydraulic-cylinder` gives a linear actuator's force and speed;
> this tile gives the rotary counterpart -- the output torque and shaft speed of a hydraulic motor from its displacement,
> the supply flow, and the pressure across it.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A hydraulic motor turns pressure and flow into torque
> and speed: the theoretical output torque is `T = PSI * displacement / (2*pi)` (times mechanical efficiency) and the shaft
> speed is `N = 231 * GPM / displacement` (times volumetric efficiency), where `231` is cubic inches per gallon. The catalog
> covers linear cylinders but not rotary motors. This adds the motor tile to the existing **`calc-mechanic.js`** module
> (Group K); no new group, trade, or dependency. Inherits spec.md through spec-v396.md.
>
> **The gap, and the evidence for it.** A `2.0 in^3/rev` motor at `2000 psi` with `10 GPM` supply, `90%` mechanical and
> `95%` volumetric efficiency, makes `T = 2000*2.0/(2*pi)*0.90 = 573 in-lb` of torque and turns at
> `N = 231*10/2.0*0.95 = 1097 rpm`; that is `T*N/63025 = 9.98 HP` of output, consistent with a pump drive of about
> `11.7 HP` fluid power less the losses. No tile does this; a mechanic sizing a wheel or winch motor had the cylinder tile
> but nothing rotary.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pressure is a pressure
(psi); the displacement is a volume per revolution (in^3/rev); the flow is a volumetric flow (GPM); the efficiencies are
dimensionless; the torque is a moment (in-lb) and the speed a rotational speed (rpm). The v18/v21 contract: any non-finite
input, or a non-positive pressure, displacement, or flow, returns `{ error }`; the efficiencies are constrained to `(0, 1]`,
and the tile reports the output torque, the shaft speed, and the resulting output horsepower. Citation discipline
(v19/v22): `GOVERNANCE.general` over hydraulic motor output by name; `editionNote` names **the motor relations
`T = PSI * displacement / (2*pi) * mech_eff` (in-lb) and `N = 231 * GPM / displacement * vol_eff` (rpm), the `231 in^3/gal`
constant, and the output power `T * N / 63025` (hp)**, and states that **this returns the theoretical torque and speed
adjusted for efficiency, that the pressure is the differential across the motor, and that it is a sizing aid, not a
substitute for the motor manufacturer performance curves**.

## 2. The tile

### 2.1 `hydraulic-motor-torque-speed` -- Hydraulic Motor Torque and Speed

```
inputs:
  psi          psi        pressure differential across the motor
  disp_in3     in^3/rev   motor displacement
  gpm          gpm        supply flow
  mech_eff     -          mechanical efficiency (default 0.90)
  vol_eff      -          volumetric efficiency (default 0.95)

torque_inlb = psi * disp_in3 / (2*pi) * mech_eff
rpm         = 231 * gpm / disp_in3 * vol_eff
output_hp   = torque_inlb * rpm / 63025
```

**Pinned worked example (2000 psi, 2.0 in^3/rev, 10 GPM, 0.90 / 0.95).** `T = 2000*2.0/(2*pi)*0.90 = 573 in-lb`;
`N = 231*10/2.0*0.95 = 1097 rpm`; `output_hp = 573*1097/63025 = 9.98 HP`. **Cross-check (double the displacement).** A
`4.0 in^3/rev` motor at the same flow halves the speed to `549 rpm` and doubles the torque to `1146 in-lb` -- more grunt,
less speed, the same power. A non-positive input takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `hydraulic-cylinder` / `hydraulic-pump-horsepower`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, hydraulic motor output, `editionNote` naming
`T = PSI*disp/(2*pi)*mech_eff`, `N = 231*GPM/disp*vol_eff`, the 231 constant, and the output-power relation);
`test/fixtures/worked-examples.json` (the base example + the double-displacement cross-check); `test/fixtures/compute-map.js`
(`hydraulic-motor-torque-speed` -> `computeHydraulicMotorTorqueSpeed` in `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `hydraulic-pump-horsepower` / `hydraulic-cylinder` / `hp-from-torque` / `gear-cascade`);
`data/search/aliases.json` ("hydraulic motor torque", "hydraulic motor speed", "motor displacement rpm", "231 gpm
displacement", "psi displacement torque", "hydraulic motor sizing", "orbital motor torque", "fluid motor rpm", "hydraulic
motor hp"); the id appended to the existing mechanic renderers block in `app.js`; the `// dims:` annotation (PSI pressure,
disp volume/rev, GPM flow, torque moment, rpm rotational speed, HP power); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the torque/speed trade-off, and the non-positive / non-finite error
seams. No new module; re-pin `calc-mechanic.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the torque / rpm / HP output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (2000 psi, 2.0 in^3, 10 GPM -> 573 in-lb, 1097 rpm).

## 5. Roadmap position

The rotary actuator in the middle of the trio: `hydraulic-pump-horsepower` (v396) drives it and `cooling-system-flow` (v398)
carries away the heat the circuit generates. A gerotor/gear-motor case-drain and a two-speed-motor displacement-shift tile
are the deliberate next follow-ons.
