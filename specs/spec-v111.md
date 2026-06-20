# roughlogic.com Specification v111 -- Fuel-Gas Altitude Derating and Natural-Gas / Propane Conversion (calc-gas.js, Group B, 2 New Tiles)

> **Status: LANDED 2026-06-20 (package 0.69.0, catalog 669 -> 676 with spec-v109 / v110).** v111 is an in-scope catalog
> expansion under the spec-v106 charter: two Tier-1 plumbing / gas-fitter tiles computed from a
> public code-derived derate rule and first-principles orifice physics, manufacturer-and-AHJ
> governed, with a redo-not-harm failure mode. It adds two tiles to the existing **`calc-gas.js`**
> module (Group B), changes no existing tile's output, and adds no new module, group, or
> dependency. It inherits everything from spec.md through spec-v110.md.
>
> **The gap, and the evidence for it.** The catalog sizes gas piping (`Gas Pipe Sizing`,
> `Low-Pressure Fuel-Gas Pressure Drop`, `Gas Appliance Connected Load`) and computes leak rate,
> but a concept-check found **no** high-altitude appliance input derate (the everyday "how much
> does this furnace lose at 6,000 ft, and does it need a kit?") and **no** natural-gas /
> propane conversion (the everyday "what changes when this appliance moves from NG to LP?"). Both
> are standard fuel-gas fitter math: the first a clean public code rule, the second clean orifice
> physics.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and reviewer-signoff
  apply. `gas-altitude-derate` carries a heating rate (`M L^2 T^-3`) and an elevation (`L`).
  `gas-fuel-conversion` carries heating rate (`M L^2 T^-3`), volumetric flow (`L^3 T^-1`), a
  manifold pressure (`M L^-1 T^-2`), and a dimensionless specific gravity and orifice-area ratio.
  Every bundled constant (the 4 percent-per-1000-ft derate factor, the 2,000 ft derate threshold,
  the default NG / LP heating values 1030 / 2500 BTU/cf, specific gravities 0.60 / 1.52, and
  manifold pressures 3.5 / 11 in. w.c.) is bundled and annotated, and each is an editable field.
- The v18 / v21 tile contract applies. Any non-finite input returns `{ error }`. For
  `gas-altitude-derate`: a non-positive input rate or a negative elevation returns `{ error }`.
  For `gas-fuel-conversion`: a non-positive input rate, heating value, specific gravity, or
  manifold pressure returns `{ error }`. Neither leaks a `NaN` / `Infinity`: divisions are by
  guarded-positive heating values, pressures, and gravities.
- The v19 / v22 citation discipline applies. `gas-altitude-derate` names the **NFPA 54 (National
  Fuel Gas Code) / IFGC** high-altitude provision by section without reproduction; the common
  4-percent-per-1000-ft-above-2000-ft convention is the bundled default and is editable, because
  the exact derate basis varies by edition and jurisdiction. `gas-fuel-conversion` uses
  `GOVERNANCE.general` over first-principles orifice flow (Q proportional to A x sqrt(pressure /
  specific gravity)) and public heating values. Neither reproduces a licensed table. **Safety
  note rendered on both:** field orifice drilling is generally prohibited; a listed manufacturer
  conversion / high-altitude kit and the AHJ govern.

## 2. The tiles

### 2.1 `gas-altitude-derate` -- High-Altitude Appliance Input Derate (NFPA 54 / IFGC)

The derated maximum input for an appliance installed at altitude, and the kit flag.

```
inputs:
  nameplate_input_btuh M L^2 T^-3      sea-level rated input
  elevation_ft         L               installation elevation
  derate_pct_per_1000  dimensionless   derate percent per 1000 ft (default 4)
  threshold_ft         L               elevation above which derate applies (default 2000)

steps_1000 = max(0, (elevation_ft - threshold_ft) / 1000)
factor     = 1 - (derate_pct_per_1000/100) x steps_1000      # floored at 0
derated_input_btuh = nameplate_input_btuh x factor
flag: elevation_ft > threshold_ft -> "verify a listed high-altitude orifice/kit per the mfr"
```

**Pinned worked example.** 100,000 BTU/hr nameplate at 6,000 ft, 4 percent per 1,000 ft above
2,000 ft: `steps = (6000 - 2000)/1000 = 4`, `factor = 1 - 0.04 x 4 = 0.84`, `derated_input =
84,000 BTU/hr`, kit flag set. **Cross-check:** the same appliance at 2,000 ft or below ->
`steps = 0`, `factor = 1.0`, `derated_input = 100,000 BTU/hr`, no kit flag. The derate basis is
editable because editions differ; the manufacturer's instructions and the AHJ govern.

### 2.2 `gas-fuel-conversion` -- Natural-Gas / Propane Conversion (Input and Orifice) (Group B, calc-gas.js)

What changes when an appliance is converted between natural gas and propane: the required
volumetric flow for each fuel at the same input, and the orifice-area ratio.

```
inputs:
  appliance_input_btuh M L^2 T^-3      appliance input (unchanged by the fuel)
  from_fuel / to_fuel  dimensionless   natural-gas / propane (sets HV, SG, manifold defaults)
  hv_from, hv_to       M L^-1 T^-2     heating values (default NG 1030, LP 2500)
  sg_from, sg_to       dimensionless   specific gravities (default NG 0.60, LP 1.52)
  p_from, p_to         M L^-1 T^-2     manifold pressures (default NG 3.5, LP 11.0 in. w.c.)

cfh_from = appliance_input_btuh / hv_from
cfh_to   = appliance_input_btuh / hv_to
# orifice flow Q ~ A x sqrt(P / SG); hold input -> solve area ratio:
area_ratio = (cfh_to / cfh_from) x sqrt( (p_from / sg_from) / (p_to / sg_to) )
output:
  cfh_from, cfh_to, area_ratio (to_orifice area / from_orifice area), direction note
```

**Pinned worked example.** 100,000 BTU/hr appliance, natural gas to propane, defaults:
`cfh_NG = 100000/1030 = 97.09`, `cfh_LP = 100000/2500 = 40.00`; `area_ratio = (40.00/97.09) x
sqrt((3.5/0.60)/(11/1.52)) = 0.412 x sqrt(5.833/7.237) = 0.412 x 0.898 = 0.370`. The propane
orifice is about 37 percent of the natural-gas orifice area (much smaller); use the listed LP kit.
**Cross-check:** propane to natural gas reverses it -> `area_ratio = 2.70` (the NG orifice is
larger). A same-fuel sanity case (NG to NG, defaults) returns `cfh_to = cfh_from` and
`area_ratio = 1.000` exactly.

## 3. Concept-check and wiring

Concept-checked against the live Group B gas tiles: `Gas Pipe Sizing`, `Low-Pressure Fuel-Gas
Pressure Drop`, `Gas Appliance Connected Load`, and `Gas Leak Rate` size and meter the system but
none derate for altitude or convert between fuels. Both tiles ship into the existing `calc-gas.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `B`; trade `["plumbing"]`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`gas-altitude-derate` -> NFPA 54 / IFGC
high-altitude provision with `nfpa.org/freeaccess`; `gas-fuel-conversion` -> `GOVERNANCE.general`
first-principles orifice flow, with the formula string and assumptions listing every bundled
constant); `test/fixtures/worked-examples.json` (both pinned examples, cross-checks, and the
same-fuel sanity); `test/fixtures/compute-map.js` (`gas-altitude-derate` ->
`computeGasAltitudeDerate`, `gas-fuel-conversion` -> `computeGasFuelConversion`, both in
`../../calc-gas.js`); `scripts/related-tiles.mjs` (`gas-altitude-derate` -> `gas-fuel-conversion`
/ `gas-meter-clock` (spec-v110) / `gas-appliance-connected-load`; `gas-fuel-conversion` ->
`gas-altitude-derate` / `gas-pipe-sizing` / `gas-meter-clock`); `data/search/aliases.json`
(`gas-altitude-derate`: "high altitude derate", "altitude derating", "furnace at altitude",
"nfpa 54 altitude", "4 percent per 1000"; `gas-fuel-conversion`: "natural gas to propane",
"lp conversion", "fuel conversion", "orifice conversion", "ng to lp"); the two ids appended to the
existing `GAS_RENDERERS` declare in `app.js`; the `// dims:` annotations; the regenerated v14
corpus + tile-index; and a `test/unit/bounds-fuzzer.test.js` block pinning both worked examples,
the cross-checks, the same-fuel sanity, and every error seam.

**Module note.** The two tiles land in the existing `calc-gas.js` (the dedicated gas module, ~14
KB, with ample cap headroom). If the addition pushes the module past its
`scripts/check-module-sizes.mjs` cap, raise it to current + ~20 percent with a dated comment. The
shared `citations.js` registry cap is bumped if needed. It remains lazy-loaded and absent from the
home-view first-paint payload.

## 4. As-landed verification (gate plan)

The standard green bar: `npm run lint` (every gate, including module-size, wiring, sw-precache,
dimensions, corpus, tile-contract, em-dash ban, and `check-readme-counts` re-pinned to the live
total **+2 tiles**, same group / module / sitemap-group counts plus two new tile URLs); `npm test`
(+5 worked-example fixtures, cross-checks, and the same-fuel sanity; the new spec-v111
bounds-fuzzer block); `npm run build` (two new tile shells, regenerated sitemap); `npm run
data:verify`; the worked-examples runner; the 320 px shell audit (the derated-input, CFH, and
area-ratio lines wrap, not scroll, on a phone); and the full-catalog render-no-nan Chromium sweep
plus the a11y gate, with the rendered output read to the value (100k at 6,000 ft -> 84,000 BTU/hr;
NG->LP at 100k -> 97.09 / 40.00 CFH, area ratio 0.370).

## 5. Roadmap position

v111 adds the install-time fuel-gas tiles (altitude derate and fuel conversion) that pair with
spec-v110's commissioning-time tiles (meter clocking and temperature rise) through the
`related-tiles` graph: a gas furnace install now has its derate, conversion, clocking, and
rise-check all one hop apart. The altitude-derate tile is a prime beneficiary of the jurisdiction /
edition-awareness pillar (spec-v106 §7), since the exact derate basis is edition- and
AHJ-dependent. Further Group B gas growth stays evidence-driven.
