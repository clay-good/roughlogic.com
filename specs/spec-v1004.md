# roughlogic.com Specification v1004 -- Natural-Gas Flue-Gas Water Dew Point (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v1003.md. Beside `combustion-lambda`,
> `oil-burner-firing-rate`, and `chimney-draft` in the combustion-service family.
>
> **The gap, and the evidence for it.** The catalog has air/wall dew points (`psychrometric`,
> `wall-condensation-gradient`) but nothing for the WATER dew point of combustion FLUE GAS -- the number a tech needs to
> know whether a vent or chimney will condense and corrode. Grep + the alias index confirmed no flue-gas dew-point
> tile. The number this settles: at 15% excess air, natural-gas flue gas condenses at about **134 F**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a percent and °F from a percent), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or negative excess air
returns `{ error }`. Citation discipline (v19/v22): the natural-gas flue-gas water dew point by name (methane
combustion stoichiometry + the Antoine water-saturation relation), `GOVERNANCE.general`; the note stresses that this is
the WATER (not sulfuric-acid) dew point, that non-condensing appliances must stay above ~135 F to the vent terminus,
and that the appliance listing, the NFPA 54 vent tables, and the AHJ govern.

## 2. The tile

### 2.1 `flue-gas-dew-point` -- Natural-Gas Flue-Gas Water Dew Point

```
inputs:
  excess_air_pct  excess combustion air (%), default 15

lambda         = 1 + excess_air_pct / 100
water_fraction = 2 / (1 + 9.52 x lambda)                          [CH4 -> 2 H2O; wet moles 1 + 9.52 lambda]
p_h2o_mmhg     = 760 x water_fraction
dew_point_c    = 1730.63 / (8.07131 - log10(p_h2o_mmhg)) - 233.426   [Antoine, water]
dew_point_f    = dew_point_c x 9/5 + 32
```

**Pinned worked example.** 15% excess air: `water = 2/(1 + 9.52 x 1.15) = ` **16.7%**; partial pressure 127 mmHg; Antoine
gives 56.6 C = **134 F**. Cross-check: stoichiometric (0% excess air): `water = 2/10.52 = ` **19.0%**; 144.5 mmHg; 59.3
C = **139 F** -- the maximum dew point, falling as excess air dilutes the products.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `oil-burner-firing-rate`); a `tile-meta.js` `_TILES` entry
(`C`); a `citations.js` entry (methane stoichiometry + Antoine, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 15%-excess-air base plus the stoichiometric-maximum cross-check, pinning the
water fraction and dew point); `test/fixtures/compute-map.js` (`flue-gas-dew-point` -> `computeFlueGasDewPoint`, module
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `combustion-lambda` / `chimney-draft` /
`flue-gas-combustion-eff`); `data/search/aliases.json` (5 collision-checked aliases: "flue gas dew point", "flue dew
point", "combustion dew point", "chimney condensation", "vent condensation"), then
`node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in the
`HVACSERVICE_RENDERERS` map, and the id added to the calc-hvacservice declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the stoichiometric-maximum and dilution directions, and the error
seams. The calc-hvacservice.js gzip cap and the Group C group shell are watched at build (cap raised for the combustion
pair). Home tile count 1,452 -> 1,453.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(15% excess air -> 16.7% water, 134 F).

## 5. Roadmap position

Combustion service beside `chimney-draft`, serving the HVAC / chimney tech (hvac). Deliberately the screen; the
appliance listing, the NFPA 54 vent-sizing tables, and the AHJ govern the venting. Stays evidence-driven. Continues the
combustion-service sweep at 1 new spec (v1004).
