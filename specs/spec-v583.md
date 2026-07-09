# roughlogic.com Specification v583 -- Excess Air from Flue-Gas O2 (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, the HVAC service bench); no new module, group, or dependency. Inherits spec.md through spec-v582.md.
>
> **The gap, and the evidence for it.** A combustion analyzer reads flue-gas oxygen, and a service tech needs to turn
> that into percent excess air to tune an appliance, but the bench (which has `combustion-air` for NFPA 54 opening
> sizing) has no tile for it. The relation is `%EA = O2 / (20.9 - O2) x 100`, or from carbon dioxide
> `%EA = (CO2max / CO2 - 1) x 100` against the fuel's ultimate CO2. The catch is that the oxygen form assumes
> **complete combustion**: if measurable carbon monoxide is present, the reading understates the excess air (some oxygen
> went to CO, not to dilution), so the tech must confirm CO is low and sample dry, air-free oxygen. A gas appliance
> targets roughly 3 to 4% oxygen (about 15 to 25% excess air) -- too little and it makes CO, too much and it wastes
> heat up the flue. The tile takes the measured oxygen (or carbon dioxide with the fuel's ultimate CO2), and returns the
> excess air with the complete-combustion caveat.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The measured oxygen and
carbon dioxide, the ultimate CO2max, the excess air, and the `20.9` constant are `dimensionless` (percents). The v18/v21
contract: any non-finite input, a measured oxygen at or above 20.9 (no combustion), a non-positive carbon dioxide (in
the CO2 form), or a non-positive CO2max returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over
the excess-air relations by name (ASME PTC 4.1 / combustion analysis practice); `editionNote` names the **excess air
from flue-gas oxygen**, prints `EA_pct = O2 / (20.9 - O2) x 100` and the carbon-dioxide form
`EA_pct = (CO2max / CO2 - 1) x 100` (CO2max about **11.7% natural gas, 13.7% propane, 15.3% #2 oil**), and states that
**the oxygen form assumes complete combustion so measurable CO understates the excess air, the reading must be dry and
air-free and sampled in the flue, a gas appliance targets about 3 to 4% oxygen (15 to 25% excess air), and the analyzer,
the appliance, and the manufacturer instructions govern** -- a tuning aid, not a certified combustion test.

## 2. The tile

### 2.1 `excess-air-o2` -- Excess Air From the Analyzer's Oxygen Reading

```
inputs:
  measured_o2_pct   %    flue-gas oxygen (dry, air-free)
  measured_co2_pct  %    flue-gas carbon dioxide (0 to use the O2 form)
  co2max_pct        %    fuel ultimate CO2 (11.7 gas / 13.7 propane / 15.3 oil; used with CO2)

EA_pct = measured_co2_pct > 0 ? (co2max_pct / measured_co2_pct - 1) x 100
                              : measured_o2_pct / (20.9 - measured_o2_pct) x 100     [%]
```

**Pinned worked example (a natural-gas appliance reading 4% oxygen).**
`EA = 4 / (20.9 - 4) x 100 = 4 / 16.9 x 100 = ` **23.7%** excess air -- at the top of the 15 to 25% target band, a
well-tuned burner. **Cross-check (the carbon-dioxide form agrees).** The same combustion reading 9% CO2 against natural
gas's 11.7% ultimate: `EA = (11.7 / 9 - 1) x 100 = ` **30%** -- close to the oxygen-based figure, the small difference
reflecting measurement scatter, and both confirm the burner is a touch rich on air. If the analyzer also showed CO, the
oxygen figure would be understated and the tech would sample deeper in the flue. The tile returns the excess air.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the O2 example + the CO2-form
cross-check); `test/fixtures/compute-map.js` (`excess-air-o2` -> `computeExcessAirO2` in `../../calc-hvacservice.js`);
`scripts/related-tiles.mjs` (-> `combustion-air` / `co-air-free` / `flue-gas-combustion-eff`);
`data/search/aliases.json` ("excess air", "flue gas o2", "combustion excess air", "o2 to excess air", "co2max
combustion", "burner tuning air", "combustion analyzer", "air fuel ratio flue"); the id appended to the hvacservice
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the O2 and CO2 forms, and the error seams (non-finite, O2 >= 20.9, non-positive CO2 /
CO2max). Hand-writes its renderer (mirroring the calc-hvacservice.js `combustion-air` pattern). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the excess-air stack wraps on a phone); render-no-nan + a11y on the new tile, output read to the
value (the 4% O2 example -> 23.7%).

## 5. Roadmap position

Opens combustion analysis in the HVAC service bench, feeding `co-air-free` (the CO correction) and
`flue-gas-combustion-eff` (the efficiency), which both build on the same analyzer readings. An air-fuel-ratio and a
lambda companion are deliberate future follow-ons. Further Group C growth stays evidence-driven.
