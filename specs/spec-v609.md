# roughlogic.com Specification v609 -- Combustion Lambda and Air-Fuel Ratio (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, the HVAC service bench); no new module, group, or dependency. Inherits spec.md through spec-v608.md.
>
> **The gap, and the evidence for it.** Spec-v583 (`excess-air-o2`) names this tile as a deliberate follow-on:
> "An air-fuel-ratio and a lambda companion." The excess-air tile turns the analyzer's oxygen into percent excess air;
> the two numbers a modern analyzer shows right beside it are **lambda** and the **air-fuel ratio**, and a tech reading
> a European-built or a newer US instrument sees lambda before excess air. Lambda is the ratio of the air actually
> supplied to the exact stoichiometric air, `lambda = 20.9 / (20.9 - O2)` from the same flue oxygen, so lambda = 1.0 is
> perfect combustion, 1.2 is 20% excess air, and it is simply `1 + excess_air/100` -- the same physics, the number the
> instrument happens to display. The air-fuel ratio puts that in the units a burner tech sets a mixture by: the actual
> pounds of air per pound of fuel, `AFR = lambda x AFR_stoichiometric`, where the stoichiometric ratio is a fuel
> property (about **17.2 for natural gas, 15.5 for propane, 14.5 for #2 oil** by mass). A gas appliance reading 3%
> oxygen is running **lambda 1.17**, 16.8% excess air, an actual **20.1:1** air-fuel ratio against the 17.2:1
> stoichiometric -- the same tune three ways. The tile reads the fuel and the flue oxygen and returns all three, so a
> tech can talk to whichever number the analyzer in their hand reports.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flue oxygen, the
lambda, the excess air, the stoichiometric and actual air-fuel ratios, and the `20.9` constant are `dimensionless`
(percents and mass ratios), carried dimensionless to the lint alongside the `excess-air-o2` sibling. The v18/v21
contract: any non-finite input, a flue oxygen at or above 20.9 (no combustion), a negative oxygen, or an unknown fuel
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the lambda and air-fuel-ratio relations
by name (combustion-analysis practice, matching the `excess-air-o2` sibling); `editionNote` prints
`lambda = 20.9 / (20.9 - O2)`, `excess_air_pct = (lambda - 1) x 100`, and `AFR_actual = lambda x AFR_stoich`, pins the
stoichiometric air-fuel ratios (**17.2 natural gas, 15.5 propane, 14.5 #2 oil**, by mass), and states that **lambda is
the same physics as excess air (lambda = 1 + excess_air/100) shown the way the instrument displays it, the oxygen form
assumes complete combustion so measurable CO understates it, the reading must be dry and air-free and sampled in the
flue, and the analyzer, the appliance, and the manufacturer instructions govern** -- a tuning aid, not a certified
combustion test.

## 2. The tile

### 2.1 `combustion-lambda` -- Lambda and Air-Fuel Ratio From the Analyzer's Oxygen

```
inputs:
  fuel          select   natural_gas (17.2) | propane (15.5) | oil2 (14.5)   (stoichiometric AFR by mass)
  flue_o2_pct   %        flue-gas oxygen (dry, air-free)

lambda          = 20.9 / (20.9 - flue_o2_pct)              [--]
excess_air_pct  = (lambda - 1) x 100                        [%]
afr_actual      = lambda x AFR_stoich(fuel)                 [lb air / lb fuel]
```

**Pinned worked example (a natural-gas appliance reading 3% oxygen).**
`lambda = 20.9 / (20.9 - 3) = 20.9 / 17.9 = ` **1.168**, so `excess_air = (1.168 - 1) x 100 = ` **16.8%** (the same
figure `excess-air-o2` returns), and `AFR = 1.168 x 17.2 = ` **20.1:1** against the 17.2:1 stoichiometric -- a
well-tuned burner a little lean on air. **Cross-check (a propane appliance reading 5% oxygen).**
`lambda = 20.9 / (20.9 - 5) = 20.9 / 15.9 = ` **1.314**, `excess_air = ` **31.4%**,
`AFR = 1.314 x 15.5 = ` **20.4:1** against 15.5:1 stoichiometric -- richer on air than the gas example, and the excess
air matches `excess-air-o2`'s O2 form exactly, confirming lambda is that number in the analyzer's own units.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`combustion-lambda` -> `computeCombustionLambda` in `../../calc-hvacservice.js`);
`scripts/related-tiles.mjs` (-> `excess-air-o2` / `co-air-free` / `flue-gas-combustion-eff`); `data/search/aliases.json`
("combustion lambda", "air fuel ratio", "lambda from o2", "afr combustion", "excess air lambda", plus question rows);
the id appended to the hvacservice renderers declare in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the lambda-equals-1-plus-EA
identity against `excess-air-o2`, the fuel switch, and the error seams (non-finite, O2 >= 20.9, negative O2, unknown
fuel). Hand-writes its renderer with a fuel `makeSelect` (mirroring the calc-hvacservice.js `flue-gas-combustion-eff`
pattern). Group C has no exact per-group audit count (`> 20`) and the mechanical-governance test is an explicit list,
so no count bump. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the 3% O2 gas example -> lambda 1.17,
20.1:1 AFR).

## 5. Roadmap position

Completes the combustion-analysis readout set from one analyzer insertion: `excess-air-o2` (excess air),
`co-air-free` (safety), `flue-gas-combustion-eff` (efficiency), and this tile (lambda and air-fuel ratio). No further
combustion follow-on is named; further Group C growth stays evidence-driven.
