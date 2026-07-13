# roughlogic.com Specification v655 -- Furnace Airflow to Temperature Rise (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, hvac), no new module, group, or dependency. Inherits spec.md through spec-v654.md.
>
> **The gap, and the evidence for it.** The `furnace-temp-rise` tile (spec-v110) is the diagnostic direction: you
> measure supply and return temperatures and it backs out the airflow. The setup direction -- pick a blower tap or
> target CFM and predict the rise you should see -- is unbuilt. Inverting the sibling's `CFM = output/(1.08 dT)`
> gives `dT = output/(1.08 CFM)`. First-principles, no new constant. The pinned example: a 100,000 BTU/hr furnace
> at 80% efficiency on **1,200 CFM** (70 F return) produces a **61.7 F rise** and a **131.7 F supply** -- inside the
> 40-70 F rating-plate band; drop to a lower tap and the rise climbs toward the high-limit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The input and output
heat rates are `M L^2 T^-3`, the efficiency is `dimensionless`, the airflow is `L^3 T^-1`, and the return/supply
temperatures and the rise are `T`. The `1.08` sensible-heat factor (`_SENSIBLE_HEAT_FACTOR`) and the default 80%
efficiency and 40-70 F rise band are the same ones `furnace-temp-rise` already uses. The v18/v21 contract: any
non-finite input, or a non-positive input, efficiency, or airflow, or a negative rise limit, returns `{ error }`.
Citation discipline (v19/v22): the sensible-heat relation solved for the rise, the inverse of the temperature-rise
tile, by name; the note states that **rise = output/(1.08 CFM), a lower airflow raises the rise (overheat risk) and
a higher airflow lowers it, the rating-plate rise range is the governing limit, and the 1.08 factor is sea-level
air** -- the equipment manufacturer and the licensed tech govern.

## 2. The tile

### 2.1 `furnace-airflow-to-rise` -- The Temperature Rise a Blower Airflow Produces

```
inputs:
  input_btuh       BTU/hr   furnace input (> 0)
  efficiency_pct   %        thermal efficiency (> 0; default 80)
  cfm              CFM      blower airflow, a tap or a target (> 0)
  return_air_F     F        return-air temperature (default 70)
  rise_min_F       F        rating-plate minimum rise (default 40)
  rise_max_F       F        rating-plate maximum rise (default 70)

output      = input_btuh x efficiency_pct / 100
delta_T     = output / (1.08 x cfm)
supply_air  = return_air_F + delta_T          (verdict: delta_T vs the plate rise range)
```

**Pinned worked example.** `input = 100,000 BTU/hr`, `eff = 80%`, `cfm = 1,200`, `return = 70 F`:
`output = 80,000 BTU/hr`, `delta_T = 80,000/(1.08 x 1,200) = ` **61.7 F**, `supply = 70 + 61.7 = ` **131.7 F** --
in the 40-70 F band.
**Cross-check (exact inverse of the temp-rise tile).** The `furnace-temp-rise` example (70 F return, 120 F supply)
derives 1,481.5 CFM; feeding 1,481.5 CFM back here gives a **50 F** rise.
**Cross-check (out-of-range).** At 900 CFM the rise climbs to 82 F (rise high, airflow too low); at 3,000 CFM it
drops to 25 F (rise low, airflow too high).

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `furnace-temp-rise`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (sensible-heat relation inverted for the rise, the note per §1); `test/fixtures/worked-
examples.json` (the pinned example plus the round-trip cross-check); `test/fixtures/compute-map.js`
(`furnace-airflow-to-rise` -> `computeFurnaceAirflowToRise`); `scripts/related-tiles.mjs` (<-> `furnace-temp-rise`,
`cfm-per-ton`, `gas-meter-clock`, `duct-static-pressure-total`); `data/search/aliases.json` ("furnace airflow to
rise", "predict temp rise from cfm", "set blower tap for rise", plus question rows, all collision-checked);
`HVACSERVICE_RENDERERS["furnace-airflow-to-rise"]` via the `_simpleRenderer` factory (field DOM ids = the input
keys) and the id added to the calc-hvacservice declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact
inverse round-trip through `computeFurnaceTempRise`, the rise-high / rise-low verdicts, and the error seams. The two
`index.html` home-count spots go 1,103 -> 1,104 (check-readme-counts gates them). The calc-hvacservice.js gzip cap
is raised as needed (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 61.7 F rise, 131.7 F supply, in range).

## 5. Roadmap position

Completes the furnace airflow/rise pair: `furnace-temp-rise` (measured temps -> airflow, the diagnostic direction)
and now `furnace-airflow-to-rise` (chosen airflow -> rise, the setup direction), exact inverses through the same
sensible-heat relation. Further Group C growth stays evidence-driven.
