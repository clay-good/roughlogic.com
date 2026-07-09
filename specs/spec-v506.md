# roughlogic.com Specification v506 -- Turbocharger Pressure Ratio and Charge-Air Temp (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v505.md.
>
> **The gap, and the evidence for it.** `volumetric-efficiency` gives an engine's induction airflow but never the
> pressure ratio or the charge-air temperature a turbo produces, which is what a tuner needs to read a compressor map
> and decide whether an intercooler is mandatory. Two catches live here. First, boost is a **gauge** number: the
> pressure ratio is the absolute manifold pressure over the absolute ambient, so you must add the ambient before
> dividing, and at altitude the same gauge boost demands a higher ratio because the ambient is lower. Second,
> compressing air heats it -- the `PR^0.283` term is the adiabatic heat of compression -- so a modest pressure ratio can
> raise the charge-air temperature by well over a hundred degrees, which is exactly why an intercooler is not optional
> on a serious build. The tile takes the target boost, the ambient pressure, the inlet air temperature, and the
> compressor efficiency, and returns the pressure ratio and the compressor-outlet temperature, so the heat problem is on
> the screen before the turbo is bolted on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The boost and ambient
pressures are pressures (`M L^-1 T^-2`, in psi); the pressure ratio and the `0.283` exponent are `dimensionless`; the
inlet and outlet temperatures carry the temperature dimension (worked in degrees Rankine internally); the compressor
efficiency percent is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive ambient pressure, a
negative boost, an inlet temperature at or below absolute zero, or a compressor efficiency outside `(0, 100]` returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the pressure-ratio and adiabatic-temperature
relations by name (compressor-map sizing; ideal-gas adiabatic compression); `editionNote` names the **turbocharger
pressure-ratio and charge-air-temperature model**, prints `PR = (ambient_abs + boost) / ambient_abs`,
`T_out = T_in x [1 + (PR^0.283 - 1) / efficiency]` with temperatures absolute, and states that **boost is a gauge
pressure so the ambient must be added before forming the ratio, the same gauge boost needs a higher pressure ratio at
altitude where the ambient is lower, the PR^0.283 term is the heat of compression that makes an intercooler necessary
(this ignores any intercooler, so it reports the compressor-outlet temperature not the manifold temperature), the
gamma = 1.4 dry-air exponent is assumed, and the compressor map and the engine build govern** -- a planning estimate,
not a tune.

## 2. The tile

### 2.1 `turbo-pressure-ratio` -- Why Boost Is a Gauge Number and Why It Needs an Intercooler

```
inputs:
  boost_psi          psi   target boost (gauge)
  ambient_psia       psia  absolute ambient pressure (14.7 at sea level, less at altitude)
  inlet_temp_f       F     compressor inlet air temperature
  compressor_eff_pct %     compressor isentropic efficiency

PR       = (ambient_psia + boost_psi) / ambient_psia                        [-]
T_in_R   = inlet_temp_f + 459.67                                            [R]
T_out_R  = T_in_R x (1 + (PR^0.283 - 1) / (compressor_eff_pct / 100))        [R]
T_out_f  = T_out_R - 459.67                                                 [F]
temp_rise = T_out_f - inlet_temp_f                                          [F]
```

**Pinned worked example (15 psi boost at sea level, 80 F inlet, 70% compressor efficiency).**
`PR = (14.7 + 15) / 14.7 = ` **2.02**. The inlet is `539.7 R`, so
`T_out = 539.7 x (1 + (2.02^0.283 - 1) / 0.70) = 539.7 x (1 + 0.221/0.70) = ` **710 R = 250 F**, a charge-air
**temperature rise of 170 F** from compression alone -- hot enough that an intercooler is mandatory to recover the
density the boost was for. **Cross-check (altitude raises the ratio for the same gauge boost).** Take the same 15 psi
gauge boost to a mile-high shop where the ambient is `12.2 psia`: `PR = (12.2 + 15) / 12.2 = ` **2.23** -- a higher
pressure ratio and a hotter outlet for the identical boost number, because the turbo works against a thinner ambient.
The tile returns the pressure ratio, the compressor-outlet temperature, and the temperature rise.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the sea-level example + the altitude
cross-check); `test/fixtures/compute-map.js` (`turbo-pressure-ratio` -> `computeTurboPressureRatio` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `volumetric-efficiency` / `density-altitude` /
`air-density-correction`); `data/search/aliases.json` ("turbo pressure ratio", "boost gauge absolute", "charge air
temp", "compressor outlet temperature", "intercooler need", "adiabatic compression", "pr calculator", "turbo sizing");
the id appended to the mechanic renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the gauge-plus-ambient ratio, the altitude-raises-PR
behavior, the temperature rise growing as efficiency falls, and the error seams (non-finite, non-positive ambient,
negative boost, sub-absolute-zero inlet, efficiency out of range). Hand-writes its renderer (mirroring the
calc-mechanic.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the PR / outlet-temp / rise stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the sea-level example -> PR 2.02, 250 F outlet).

## 5. Roadmap position

Adds the forced-induction thermodynamics beside `volumetric-efficiency` (the airflow the boost feeds). An intercooler-
effectiveness companion (recovered density from the outlet temperature and the intercooler efficiency), a compressor-
mass-flow estimate, and a wastegate-duty tie-in are deliberate future follow-ons. Further Group K growth stays evidence-
driven.
