# roughlogic.com Specification v726 -- Max Boost Before a Charge-Air Temperature Limit (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v725.md. Sweep-11 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `turbo-pressure-ratio` tile runs the compressor model forward:
> from a boost it returns the charge-air (compressor-outlet) temperature. The tuning question is the inverse -- **how much
> boost before the charge-air temperature hits a limit**. From `T_out = T_in x [1 + (PR^0.283 - 1)/eff]`,
> `PR = [1 + eff x (T_out/T_in - 1)]^(1/0.283)` and `boost = ambient x (PR - 1)` (temperatures absolute). The number this
> settles: an **80 F** inlet, **70%** compressor, **250 F** charge-air limit tops out near **15 psi**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`turbo-pressure-ratio` sibling: the temperatures are `T` (deg F), the ambient and returned boost are `M L^-1 T^-2` (psi),
and the pressure ratio and efficiency are dimensionless. It reuses the sibling's gamma = 1.4 (0.283 exponent) adiabatic
model and works in absolute (Rankine) temperature. The v18/v21 contract: any non-finite input, an inlet or charge-air
temperature at or below absolute zero, an efficiency outside (0, 100], or a non-positive ambient returns `{ error }`;
additionally, a charge-air limit at or below the inlet temperature (compressing air only heats it, so no positive boost
fits) returns an explanatory `{ error }`. Citation discipline (v19/v22): the charge-air-temperature model solved for the
boost, `GOVERNANCE.general` matching the sibling; the note states that **above this boost the outlet air is hotter than
the limit, so more intercooling (which resets the check against the intercooler-outlet temperature), a more efficient
compressor, or a cooler inlet is needed, this is the compressor-OUTLET temperature and ignores any intercooler, and the
compressor map and the engine build govern**.

## 2. The tile

### 2.1 `turbo-max-boost-for-charge-temp` -- Max Boost Before a Charge-Air Temperature Limit

```
inputs:
  max_charge_temp_f     T             charge-air (compressor-outlet) temperature limit (deg F)
  inlet_temp_f          T             compressor inlet air temperature (deg F, must be below the limit)
  compressor_eff_pct    dimensionless isentropic efficiency (over 0, up to 100; default 70)
  ambient_psia          M L^-1 T^-2   ambient pressure (> 0, default 14.7)

ratio = (max_charge_temp_f + 459.67) / (inlet_temp_f + 459.67)   (must be > 1)
PR = [1 + (compressor_eff_pct/100) x (ratio - 1)]^(1/0.283)
max_boost_psi = ambient_psia x (PR - 1)
```

**Pinned worked example.** limit = 250 F, inlet = 80 F, eff = 70%, ambient = 14.7 psia:
`ratio = 709.67 / 539.67 = 1.315`, `PR = [1 + 0.70 x 0.315]^(1/0.283) = 1.2205^3.534 = 2.02`,
`max_boost = 14.7 x 1.02 = ` **15.0 psi**; feeding 15.0 psi back through `turbo-pressure-ratio` at the same inlet /
efficiency / ambient returns a 250 F compressor-outlet temperature, the limit. A more efficient 78% compressor heats less,
so it allows more boost (~17 psi) under the same limit.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) placed beside `turbo-pressure-ratio` in the later spec-vNN
section, well past the Group K exact-12 audit block; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (charge-air
model solved for the boost, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned
example); `test/fixtures/compute-map.js` (`turbo-max-boost-for-charge-temp` -> `computeTurboMaxBoostForChargeTemp`);
`scripts/related-tiles.mjs` (-> `turbo-pressure-ratio` / `volumetric-efficiency` / `density-altitude` /
`air-density-correction`); `data/search/aliases.json` (5 collision-checked question aliases: "max boost before charge air
too hot", "how much boost before intercooler needed", ...); the calc-mechanic `MECHANIC_RENDERERS` map entry via the
shared `_simpleRenderer` factory (four number fields) and the id added to the calc-mechanic declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeTurboPressureRatio` across a
limit/inlet/efficiency sweep, the higher-efficiency-more-boost monotonicity, and the error seams (including the
limit-at-or-below-inlet guard). The calc-mechanic.js gzip cap (raised to 44000 B in spec-v725) is expected to hold. Verify
at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,174 -> 1,175.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 15.0 psi for a 250 F limit
at an 80 F inlet, 70% compressor).

## 5. Roadmap position

Pairs the forward turbo tile (`turbo-pressure-ratio`, charge-air temp from a boost) with its inverse (boost from a
charge-air limit), the two halves of the intercooling question. Closes the sweep-11 mechanic pair. Further Group K
mechanic growth stays evidence-driven.
