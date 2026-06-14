# roughlogic.com Specification v63 -- Gas Appliance Demand and Relief Discharge (2 New Tiles)

> **Implementation status: OPEN (proposed 2026-06-13; targets package 0.57.0, a
> minor; catalog 594 -> 596, Group B 46 -> 48).** v63 inherits everything from
> spec.md through spec-v62.md and changes none of it. It assumes v62 has landed
> (catalog base 594) and deepens **Group B (Plumbing and Gas)**.
>
> v63 adds the two safety-and-demand tiles that bracket fuel-gas and water-heater
> work: **gas appliance demand** (sum the connected appliance inputs into the total
> CFH that feeds pipe sizing) and the **water-heater T&P relief-discharge check**
> (is the relief valve rated for the heater, and is the discharge line legal). Group
> B sizes a gas pipe (`gas-pipe-sizing`) and a heater's expansion (`wh-expansion-
> tank`), but it had no tile that builds the demand list those sizing tools start
> from, and none that checks the relief valve and its drain -- the single most-cited
> water-heater inspection failure. **No new group, no new dependencies, no
> telemetry, no AI, US standards only.** Both land in `calc-plumbing.js`.
>
> **The gap, and the evidence for it.** A concept-check for
> appliance-demand / connected-load / cfh / gas-load / relief-valve / t&p / tpr /
> relief-discharge returned nothing. `gas-pipe-sizing` sizes a pipe *given* a CFH and
> a length but never sums an appliance schedule into that CFH (it assumes you bring
> it); no tile checks a temperature-and-pressure relief valve's rating against the
> heater input or the discharge-pipe rules.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `gas-appliance-demand` carries an energy rate (`E/T`,
  BTU/hr) divided by a volumetric heating value (`E/L^3`, BTU/ft^3) to a volumetric
  flow (`L^3/T`, CFH). `tpr-discharge` compares two energy rates (`E/T`, BTU/hr) and
  resolves a discharge pipe size (`L`) from the valve outlet; its output is a verdict
  plus a checklist, not a continuous quantity.
- The v18/v21 tile contract applies. `gas-appliance-demand`: a non-finite or
  negative appliance input, an empty appliance list, or a non-positive heating value
  returns `{ error }`. `tpr-discharge`: a non-finite or non-positive heater input or
  valve rating returns `{ error }`; the pass/fail is a strict comparison and the
  discharge size is the valve outlet (never reduced).
- The v19/v22 citation discipline applies. Both use `GOVERNANCE.general`.
  `gas-appliance-demand` names **IFGC 2021 Section 402 / NFPA 54 (National Fuel Gas
  Code)** by name, with the standard heating values (natural gas ~1,000 BTU/ft^3,
  propane ~2,516 BTU/ft^3) as editable inputs; `tpr-discharge` names **IPC 2021
  Section 504 (504.4 rating, 504.6 discharge)** and **ANSI Z21.22 / CSA 4.4** by
  name. Standard text is not reproduced.
- Tile ids are kebab-case and checked against the live ids: `gas-appliance-demand`
  and `tpr-discharge` do not collide and are not concept-duplicates (Section 3).

## 2. The tiles

### 2.1 `gas-appliance-demand` -- Connected Load to CFH (Group B, calc-plumbing.js)

A gas system is sized for the full connected appliance load (no diversity, unless an
approved demand factor applies). This tile sums the appliance input ratings into a
total BTU/hr and converts it to the cubic-feet-per-hour demand that `gas-pipe-sizing`
needs, for the selected fuel's heating value.

```
inputs:
  appliances    list    each appliance input rating (BTU/hr) -- furnace, WH, range, dryer, ...
  fuel          choice  natural_gas | propane (sets the default heating value)
  heating_value E/L^3   heating value of the gas (BTU/ft^3; default 1000 NG / 2516 LP)

total_btuh = sum(appliances)
cfh        = total_btuh / heating_value
```

Outputs: the total connected load (BTU/hr), the demand (CFH) for the selected fuel,
and the per-appliance contribution. The note line states: fuel-gas piping is sized
for the full connected load unless the AHJ accepts a demand factor (IFGC 402.2);
propane delivers more energy per cubic foot, so the same BTU load is fewer CFH; and
this CFH plus the longest run length feed `gas-pipe-sizing` -- it is the demand, not
the pipe size.

**Worked example (pinned).** Furnace 100,000 + water heater 40,000 + range 65,000 +
dryer 35,000 = **240,000 BTU/hr** connected. On natural gas at 1,000 BTU/ft^3:
cfh = 240,000 / 1,000 = **240 CFH**. Cross-check (same load on propane at
2,516 BTU/ft^3): cfh = 240,000 / 2,516 = **95.4 CFH** -- the same appliances, far
fewer CFH, which sizes a smaller pipe for the same length. Degenerate inputs (empty
list, negative input, heating_value <= 0, non-finite) return an error.

### 2.2 `tpr-discharge` -- Water-Heater Relief Valve and Discharge Check (Group B, calc-plumbing.js)

Every storage water heater carries a temperature-and-pressure (T&P) relief valve, and
the valve's rated relief capacity must equal or exceed the heater input. The
discharge line then has strict rules: full valve-outlet size, no reduction, downhill
to an approved point, air gap. This tile checks the rating and reports the discharge
requirements.

```
inputs:
  heater_input   E/T    heater input rating (BTU/hr)
  valve_rating   E/T    T&P valve's marked relief capacity (BTU/hr)
  outlet_size    L      valve discharge-outlet size (in; typ. 3/4)

rating_ok      = valve_rating >= heater_input
discharge_in   = outlet_size           the line is never reduced below the outlet
```

Outputs: the rating pass/fail (valve capacity vs heater input), the minimum
discharge-pipe size (the valve outlet, not reduced), and the IPC 504.6 discharge
checklist (gravity-drain, no traps, terminate 6 in above an air gap / approved
receptor, of an approved material, run to the outdoors or an indoor receptor per the
AHJ). The note line states: an undersized or missing T&P valve is the top water-
heater safety failure; the discharge pipe must be the full outlet size and may not
serve any other valve; and a valve replaced must match the heater's input and working
pressure (ANSI Z21.22).

**Worked example (pinned).** Heater input 50,000 BTU/hr; T&P valve marked
150,000 BTU/hr; 3/4 in outlet. Rating check: 150,000 >= 50,000 -> **PASS**; minimum
discharge pipe = **3/4 in** (no reduction); the 504.6 checklist applies. Cross-check
(a salvaged valve marked 40,000 BTU/hr on the same heater): 40,000 >= 50,000 is
false -> **FAIL**, the valve is undersized and must be replaced. Degenerate inputs
(heater_input <= 0, valve_rating <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the live catalog. `gas-pipe-sizing` sizes a branch from a CFH
and a length using Spitzglass/Weymouth/IGT but takes the CFH as given;
`gas-appliance-demand` builds that CFH from the appliance schedule -- the upstream
step, a different input and output. `gas-leak-rate` is an orifice-flow leak estimate,
unrelated to connected load. `wh-expansion-tank` and `water-heater-recovery` size the
thermal-expansion tank and recovery rate; neither checks the T&P relief valve or its
discharge line, which is `tpr-discharge`'s sole job. **Both ship**, into
`calc-plumbing.js`.

Per-tile wiring (each tile): a `tools-data.js` row (group `B`, trades
`["plumbing"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`gas-appliance-demand`: IFGC 2021 Section 402 / NFPA 54 by name,
`GOVERNANCE.general`, assumptions listing the default heating values and the full-
connected-load rule; `tpr-discharge`: IPC 2021 Section 504 and ANSI Z21.22 by name,
`GOVERNANCE.general`, assumptions listing the no-reduction discharge rule and the
default 3/4 in outlet); `test/fixtures/worked-examples.json` (the 240,000 BTU/hr load
and the 50,000 vs 150,000 relief check, plus the propane and undersized-valve cross-
checks); `test/fixtures/compute-map.js` (module path `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (`gas-appliance-demand` -> `gas-pipe-sizing` /
`gas-pipe-pressure-drop` / `tankless-gpm`; `tpr-discharge` -> `wh-expansion-tank` /
`water-heater-recovery` / `thermal-expansion-volume`); `data/search/aliases.json`
(`gas-appliance-demand`: "gas demand", "connected load", "cfh", "appliance load",
"btu load", "gas input"; `tpr-discharge`: "t&p valve", "relief valve", "tpr",
"discharge pipe", "water heater relief", "pressure relief"); the `// dims:`
annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins both worked examples, the propane and
undersized-valve cross-checks, and every error seam (empty appliance list, negative
input, non-positive heating value, non-positive heater input or valve rating).

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` must agree
at **596 tiles** and the matching sitemap URL count); `npm test` (+2 tests);
`npm run build` (596 tile shells + sitemap); `npm run data:verify`; the worked-
examples runner (+2 fixtures); the 320 px shell audit (the total/CFH/per-appliance
list for the demand, and the pass/fail plus discharge checklist for the relief, must
wrap, not scroll, on a phone); and the full-catalog render-no-nan Chromium sweep plus
the a11y gate, with the rendered output read to the value (240,000 BTU/hr -> 240 CFH
NG; 50,000 input vs 150,000 valve -> PASS, 3/4 in discharge).

## 5. Roadmap position

v63 brings Group B to 48 tiles and closes two safety-critical gaps: the demand list
that feeds gas sizing (`gas-appliance-demand`) and the relief-valve check that tops
the water-heater inspection failure list (`tpr-discharge`). It is the third of the
v61-v64 plumbing expansion. Further Group B growth should stay evidence-driven (a
named gap a working plumber hits), not catalog-filling.
