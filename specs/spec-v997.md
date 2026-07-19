# roughlogic.com Specification v997 -- Oil Burner Nozzle Firing Rate (GPH) (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v996.md. Beside `combustion-lambda` in the
> combustion-service family.
>
> **The gap, and the evidence for it.** The catalog handles gas appliance demand (CFH) and combustion tuning, but
> nothing sizes the oil burner NOZZLE -- the gallons-per-hour firing rate a tech sets on every oil job. Grep confirmed
> no oil-burner / nozzle-GPH tile. The number this settles: 88,000 BTU/hr of output at 85% efficiency is a **0.75 GPH**
> nozzle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, BTU/hr and GPH from BTU/hr, a percent, and BTU/gal),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive output or heating value, or an efficiency outside (0, 100] returns `{ error }`. Citation discipline
(v19/v22): the oil burner nozzle firing rate by name (NORA / oil-heat practice; EIA No. 2 distillate heating value),
`GOVERNANCE.general`; the note stresses that the ~138,500 BTU/gal heating value is editable, that nozzles come in fixed
GPH steps and spray patterns, that the actual flow scales with the square root of the pump-pressure ratio (rated at 100
psi), and that the rating plate, nozzle chart, pump pressure, and a combustion analysis govern.

## 2. The tile

### 2.1 `oil-burner-firing-rate` -- Oil Burner Nozzle Firing Rate (GPH)

```
inputs:
  output_btu_hr                design heat output (BTU/hr), default 88000
  steady_state_efficiency_pct  steady-state (combustion) efficiency (%), default 85
  heating_value_btu_gal        oil heating value (BTU/gal, No. 2 ~138,500), default 138500

input_btu_hr    = output_btu_hr / (steady_state_efficiency_pct / 100)
firing_rate_gph = input_btu_hr / heating_value_btu_gal
```

**Pinned worked example.** 88,000 BTU/hr output, 85% efficiency, 138,500 BTU/gal: `input = 88,000 / 0.85 = ` **103,529
BTU/hr**; `firing rate = 103,529 / 138,500 = ` **0.75 GPH** -> a 0.75 GPH nozzle. Cross-check: 120,000 BTU/hr output at
82% efficiency: `input = 146,341 BTU/hr`; `firing rate = ` **1.06 GPH**.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `combustion-lambda`); a `tile-meta.js` `_TILES` entry
(`C`); a `citations.js` entry (NORA / oil-heat practice; EIA distillate HHV, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base plus the larger-appliance cross-check, pinning the input and firing
rate); `test/fixtures/compute-map.js` (`oil-burner-firing-rate` -> `computeOilBurnerFiringRate`, module
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `combustion-lambda` / `gas-appliance-demand` /
`manual-j-heating`); `data/search/aliases.json` (5 collision-checked aliases: "oil burner", "oil nozzle", "gph nozzle",
"oil firing rate", "nozzle gph"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the
`_simpleRenderer` factory in the `HVACSERVICE_RENDERERS` map, and the id added to the calc-hvacservice declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning both examples, the efficiency / heating-value directions, and the error seams.
The calc-hvacservice.js gzip cap and the Group C group shell are watched at build (cap raised for this tile). Home tile
count 1,445 -> 1,446.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(88,000 / 0.85 / 138,500 -> 0.75 GPH).

## 5. Roadmap position

Oil-heat service beside `combustion-lambda`, serving the oil-burner service tech (hvac). Deliberately the sizing aid;
the appliance rating plate and firing range, the nozzle chart, the pump pressure, and a proper combustion analysis
govern the setup. Stays evidence-driven. Continues the combustion-service sweep at 1 new spec (v997).
