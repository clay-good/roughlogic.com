# roughlogic.com Specification v594 -- Flue-Gas Combustion Efficiency / Stack Loss (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, the HVAC service bench); no new module, group, or dependency. Inherits spec.md through spec-v593.md.
>
> **The gap, and the evidence for it.** Two landed specs already point at this tile by name: spec-v583
> (`excess-air-o2`) and spec-v584 (`co-air-free`) both say their analyzer readings "feed `flue-gas-combustion-eff`
> (the efficiency)" -- and that id has never existed. It is the third number on every combustion analyzer screen: the
> steady-state combustion efficiency, computed from the same oxygen reading and the stack-vs-air temperature rise the
> bench already collects. The mechanism is the stack-loss (Siegert) method used by the analyzers themselves (Madur,
> Testo, Bacharach): the flue CO2 is reconstructed from the oxygen (`CO2 = CO2max x (1 - O2 / 20.9)`), the dry stack
> loss is `qA_pct = dT_C x (A1 / CO2 + B)` with the temperature difference in Celsius degrees and A1 / B the DIN
> per-fuel Siegert coefficients, and the combustion efficiency is `100 - qA` -- a **net (LHV) basis** figure, because
> the Siegert loss ignores the latent heat of the water vapor formed from the fuel's hydrogen. The catch the tile
> exists to flag: **US analyzers display efficiency on the gross (HHV) basis**, which counts that latent heat as lost,
> so the same flue reading that is 90.7% net is roughly 81.8% on the analyzer screen for natural gas. The tile returns
> both, converting net to an approximate gross with the fuel's LHV/HHV ratio -- cross-checked within about half a
> point against the published TSI fuel-oil efficiency table -- so a tech can compare the number against either a
> European net spec or a US analyzer readout without being ten points confused.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The stack and
combustion-air temperatures are `T`; the measured oxygen, reconstructed CO2, stack loss, both efficiencies, the Siegert
coefficients, and the LHV/HHV ratios are `dimensionless` (percents and per-fuel empirical constants). The v18/v21
contract: any non-finite input, an oxygen below 0 or at/above 20.9 (no combustion), a stack temperature at or below
the combustion-air temperature (no stack rise to lose), or an unknown fuel returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the Siegert stack-loss method by name (DIN combustion-analysis practice as
implemented by flue-gas analyzers); `editionNote` prints `CO2 = CO2max x (1 - O2 / 20.9)`,
`qA_pct = dT_C x (A1 / CO2 + B)` with `dT_C = (T_stack_F - T_air_F) x 5 / 9`, `eff_net = 100 - qA`, and
`eff_gross ~ eff_net x LHV/HHV`; pins the per-fuel constants (A1, B, CO2max, LHV/HHV): **natural gas 0.37 / 0.009 /
11.7% / 0.902, propane 0.475 / 0.000 / 13.7% / 0.920, #2 oil 0.50 / 0.007 / 15.4% / 0.939**; and states that **the
net figure is the European analyzer convention and the gross figure is what US analyzers display, the gross conversion
is approximate (within about a point of the analyzer tables), the sample must be dry and taken in the undiluted flue
before the draft hood, condensing appliances recover latent heat so a condensing unit is judged by its measured
efficiency not this stack loss, measurable CO adds an incomplete-combustion loss this tile ignores, and the analyzer,
the appliance, and the manufacturer instructions govern** -- a tuning aid, not a certified combustion test or an AFUE
rating.

## 2. The tile

### 2.1 `flue-gas-combustion-eff` -- Combustion Efficiency From the Analyzer's O2 and Stack Temperature

```
inputs:
  fuel              select   natural_gas | propane | oil2   (per-fuel A1 / B / CO2max / LHV-HHV)
  flue_o2_pct       %        flue-gas oxygen (dry, undiluted)
  stack_temp_f      F        flue-gas temperature at the sample point
  air_temp_f        F        combustion-air (ambient supply) temperature

co2_pct       = CO2max x (1 - flue_o2_pct / 20.9)                          [%]
qa_pct        = (stack_temp_f - air_temp_f) x 5/9 x (A1 / co2_pct + B)     [%]  (dry stack loss, Siegert)
eff_net_pct   = 100 - qa_pct                                               [%]  (net / LHV basis)
eff_gross_pct = eff_net_pct x LHV/HHV                                      [%]  (approx gross / HHV basis, US analyzer convention)
```

**Pinned worked example (a natural-gas furnace reading 5% O2 at a 400 F stack over 70 F air).**
`CO2 = 11.7 x (1 - 5 / 20.9) = ` **8.90%**. `dT = (400 - 70) x 5/9 = 183.3 C`.
`qA = 183.3 x (0.37 / 8.901 + 0.009) = ` **9.27%** stack loss, so `eff_net = ` **90.7%** and
`eff_gross = 90.73 x 0.902 = ` **81.8%** -- the number a US analyzer would display, right where a healthy
non-condensing 80-plus furnace should read. **Cross-check (the published analyzer table agrees).** A #2-oil burner at
4% O2 with a 500 F net stack rise (570 F stack over 70 F air): `CO2 = 15.4 x (1 - 4 / 20.9) = 12.45%`,
`qA = 277.8 x (0.50 / 12.4526 + 0.007) = 13.10%`, `eff_net = 86.9%`, `eff_gross = 86.90 x 0.939 = ` **81.6%** against
**82.1%** in the TSI Combustion Analysis Basics fuel-oil efficiency table at the same reading -- agreement within half
a point, which is the stated tolerance of the approximate gross conversion.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the gas example + the oil
cross-check); `test/fixtures/compute-map.js` (`flue-gas-combustion-eff` -> `computeFlueGasCombustionEff` in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `excess-air-o2` / `co-air-free` / `chimney-draft`);
`data/search/aliases.json` ("combustion efficiency", "stack loss", "flue gas efficiency", "siegert", "steady state
efficiency", "analyzer efficiency", "flue loss", plus question rows); the id appended to the hvacservice renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples and the error seams (non-finite, O2 outside 0 to 20.9, stack at or below air temperature).
Hand-writes its renderer with a fuel `makeSelect` (mirroring the calc-hvacservice.js `excess-air-o2` pattern).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (the four-input stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 5% O2 gas example -> 90.7% net / 81.8% gross).

## 5. Roadmap position

Completes the combustion-analysis triad that spec-v583 and spec-v584 both named: `excess-air-o2` (the air),
`co-air-free` (the safety), and this tile (the efficiency), all from one analyzer insertion. A condensing-appliance
latent-recovery estimate and an incomplete-combustion (CO) loss term are deliberate future follow-ons. Further Group C
growth stays evidence-driven.
