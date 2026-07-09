# roughlogic.com Specification v557 -- VFD Reflected-Wave Cable Length Limit (calc-motor.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`**
> (Group A, the motor bench); no new module, group, or dependency. Inherits spec.md through spec-v556.md.
>
> **The gap, and the evidence for it.** `vfd-energy-savings` is energy-only; nothing checks the reflected-wave problem
> that damages motors on long drive-to-motor cables. A modern IGBT drive switches so fast that the voltage pulse
> travels down the cable like a wave, reflects off the motor's high impedance, and can **double** at the motor
> terminals. The catch is that the limit is set by the drive's **rise time**, not the motor horsepower or the cable
> ampacity: above a critical cable length the reflection fully develops, and the peak terminal voltage reaches twice the
> DC bus. NEMA MG-1 Part 31 caps the inverter-duty motor terminal voltage (about 3.1 times the rated line-to-line, or
> 1600 V for 600 V systems), while an ordinary general-purpose motor is limited far lower. The tile takes the drive rise
> time, the cable velocity, the system voltage, and the run length, and returns the critical length, the peak terminal
> voltage, and whether it exceeds the inverter-duty and general-purpose limits -- so a long run gets a dV/dt filter or an
> inverter-duty motor before the insulation fails.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rise time is a time
(`T`, in microseconds); the cable propagation velocity is `L T^-1` (ft/us); the critical and run lengths are lengths
(`L`, in ft); the system, bus, and peak voltages and the limits are `M L^2 T^-3 I^-1` (volts); the velocity percent of
light is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive rise time, velocity percent,
system voltage, or run length returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
reflected-wave relations by name (NEMA MG-1 Part 31; transmission-line reflection); `editionNote` names the **VFD
reflected-wave cable-length limit**, prints `cable_velocity = 0.01 x velocity_pct x 984`,
`L_crit = rise_time x cable_velocity / 2`, `V_bus = sqrt(2) x V_LL`, `V_peak = 2 x V_bus` when the run exceeds `L_crit`,
and the comparison against `3.1 x V_LL` (inverter-duty) and a general-purpose limit, and states that **the limit is set
by the drive rise time not the motor horsepower, above the critical length the reflection fully develops and the peak
terminal voltage reaches twice the DC bus, NEMA MG-1 Part 31 inverter-duty insulation withstands about 3.1 times the
line-to-line while a general-purpose motor is limited near 1000 V, the fix is a dV/dt or sine-wave filter or an
inverter-duty motor, and the drive and motor data govern** -- a screening aid, not the manufacturer's spec.

## 2. The tile

### 2.1 `vfd-reflected-wave` -- Why the Peak Motor Voltage Doubles on a Long Drive Cable

```
inputs:
  rise_time_us      us   drive output voltage rise time (0.1 typical IGBT)
  velocity_pct      %    cable propagation velocity as a percent of the speed of light (~50)
  system_voltage_v  V    system line-to-line voltage (V_LL)
  run_length_ft     ft   drive-to-motor cable length

cable_velocity = 0.01 x velocity_pct x 984                              [ft/us]
L_crit         = rise_time_us x cable_velocity / 2                      [ft]
V_bus          = sqrt(2) x system_voltage_v                            [V]
V_peak         = run_length_ft > L_crit ? 2 x V_bus : V_bus x (1 + run_length_ft / L_crit)   [V]
limit_invduty  = 3.1 x system_voltage_v                                [V]
```

**Pinned worked example (a 480 V drive, 0.1 us rise, 50% cable velocity, 100 ft run).** The cable velocity is
`0.5 x 984 = 492 ft/us`, so `L_crit = 0.1 x 492 / 2 = ` **24.6 ft** -- and the 100 ft run is well past it, so the
reflection fully develops. The DC bus is `sqrt(2) x 480 = 679 V`, and the peak terminal voltage is
`2 x 679 = ` **1,358 V**. That is under the inverter-duty limit of `3.1 x 480 = 1,488 V`, so an inverter-duty motor
survives -- but it **exceeds** a general-purpose motor's ~1,000 V limit, so a standard motor on this run would have its
insulation punished. **Cross-check (a short run never reflects).** Keep the drive but run only `15 ft` (under the 24.6 ft
critical length): the reflection does not fully develop and the peak stays near the `679 V` bus -- no reflected-wave
problem, the reason short leads are safe. The tile returns the critical length, the peak terminal voltage, and the
limit comparisons.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the long-run example + the short-run
cross-check); `test/fixtures/compute-map.js` (`vfd-reflected-wave` -> `computeVfdReflectedWave` in
`../../calc-motor.js`); `scripts/related-tiles.mjs` (-> `vfd-energy-savings` / `cable-bend-radius` /
`reduced-voltage-starter`); `data/search/aliases.json` ("reflected wave", "vfd cable length", "nema mg-1 part 31",
"motor terminal voltage", "dv/dt filter", "long cable vfd", "reflected wave motor", "igbt overvoltage"); the id
appended to the motor renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the critical-length relation, the peak-voltage doubling past
L_crit, the limit comparisons, and the error seams (non-finite, non-positive rise / velocity / voltage / run). Hand-
writes its renderer (mirroring the calc-motor.js `vfd-energy-savings` pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the L_crit / V_peak / limit stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 100 ft example -> 24.6 ft critical, 1,358 V peak).

## 5. Roadmap position

Adds the reflected-wave cable check beside `vfd-energy-savings` (the energy side of the same drive). A dV/dt filter
selection helper and a rise-time-from-carrier-frequency estimate are deliberate future follow-ons. Further Group A
growth stays evidence-driven.
