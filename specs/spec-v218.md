# roughlogic.com Specification v218 -- Blower-Door Air-Tightness: ACH50, Natural Infiltration, Code Check (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v218..v220 (the residential air-tightness and ventilation trio -- the
> blower-door result the catalog never carried, the ASHRAE 62.2 whole-house ventilation the tight house then needs,
> and the heating/cooling load that infiltration drives). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the blower-door test is run by the HVAC tech,
> the weatherization contractor, and the energy auditor. Adds one tile to **`calc-hvacservice.js`** (Group C); no new
> module, group, or dependency. Inherits spec.md through spec-v217.md.
>
> **The gap, and the evidence for it.** Group C carries the mechanical-ventilation side of indoor air -- `air-changes-hour`
> (delivered ACH vs ASHRAE 62.1/170), `outdoor-air-ventilation` (62.1 breathing-zone OA), `outdoor-air-mix`, and
> `duct-leakage` (SMACNA duct-class). But nothing converts a blower-door reading into the number every weatherization
> job turns on: ACH50. The technician measures CFM at 50 Pa with the fan, and the building code states the limit in
> air changes per hour at 50 Pa (IECC R402.4.1.2: <= 3 ACH50 in climate zones 3-8, <= 5 in zones 1-2), so the raw CFM50
> off the gauge has to be normalized to the conditioned volume before it means pass or fail. The same reading also sets
> the *natural* infiltration the house actually leaks year-round (the LBL divide-by-N rule), which is the input the
> next two tiles in this batch consume. The catalog can balance a duct system but cannot tell a tech whether the
> envelope they just tested meets code.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The conditioned volume
is a volume (`L^3`, ft^3); the measured CFM50 and the natural-infiltration CFM are an airflow (`L^3 T^-1`, cfm); ACH50
and the natural ACH are a frequency (`T^-1`, air changes per hour); the LBL N-factor and the target ACH50 are
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive conditioned volume / CFM50 / N-factor /
target, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the normalization and infiltration
relations by name; `editionNote` names **IECC R402.4.1.2** (the air-leakage limit, stated in ACH50, with the
<= 3 / <= 5 climate-zone thresholds the user pins as the target), the **ASTM E779 / E1827** blower-door test methods
(the CFM50 the test produces), and the **LBL / ASHRAE Fundamentals infiltration model** (the N-factor that divides
ACH50 down to the annual-average natural ACH), and states that **the N-factor depends on climate zone, building height,
and wind shielding (a single-story sheltered house and an exposed three-story house differ by roughly a factor of
two), the code threshold is the AHJ-adopted IECC edition and climate zone, the volume is the conditioned volume not the
floor area, and this is a field normalization, not a code certificate** -- an ordering and verdict aid, not the rater's
signed test report.

## 2. The tile

### 2.1 `blower-door-ach50` -- Blower-Door Air-Tightness (ACH50, Natural Infiltration, Code Check)

```
inputs:
  cfm50         L^3 T^-1       measured airflow at 50 Pa (off the blower-door gauge), cfm
  volume_ft3    L^3            conditioned volume of the tested zone, ft^3
  n_factor      dimensionless  LBL infiltration N-factor (ACH50 -> natural ACH divisor), default 17
  target_ach50  dimensionless  code air-leakage limit to test against, ACH50 (default 3, IECC CZ 3-8)

ach50    = cfm50 * 60 / volume_ft3
verdict  = ach50 <= target_ach50 ? "PASS -- meets the target ACH50" : "FAIL -- exceeds the target; air-seal and retest"
ach_nat  = ach50 / n_factor                  # LBL: annual-average natural air changes per hour
cfm_nat  = ach_nat * volume_ft3 / 60         # natural infiltration airflow, cfm (feeds v219 / v220)
```

**Pinned worked example (1,600 ft^2 two-story, first test).** A 1,600 ft^2 house with 8 ft ceilings, so a conditioned
volume of `1,600 * 8 = 12,800 ft^3`; the gauge reads `cfm50 = 960`; N-factor 17 (a moderate two-story); target 3 ACH50
(IECC climate zone 5): `ach50 = 960 * 60 / 12,800 = 57,600 / 12,800 = 4.5 ACH50`; `4.5 > 3`, so **FAIL -- air-seal and
retest**; `ach_nat = 4.5 / 17 = 0.265 ACH`; `cfm_nat = 0.265 * 12,800 / 60 = ` **56.5 cfm of natural infiltration**.
**Cross-check (after air sealing, retest).** The crew foams the rim joist and seals the top plates and the gauge now
reads `cfm50 = 600`: `ach50 = 600 * 60 / 12,800 = 36,000 / 12,800 = 2.81 ACH50`; `2.81 <= 3`, so **PASS**;
`ach_nat = 2.81 / 17 = 0.165 ACH`; `cfm_nat = 0.165 * 12,800 / 60 = ` **35.3 cfm**. The same house, the same gauge: the
sealing pass dropped CFM50 by a third, carried the envelope across the code line, and cut the year-round infiltration
airflow from 56.5 to 35.3 cfm -- the number the ASHRAE 62.2 ventilation sizing (v219) and the infiltration load (v220)
both turn on.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac","weatherization"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the normalization and infiltration relations, `editionNote` naming IECC R402.4.1.2,
ASTM E779/E1827, and the LBL/ASHRAE N-factor, with the N-factor-varies / AHJ-edition / conditioned-volume /
not-a-certificate caveats); `test/fixtures/worked-examples.json` (the first-test FAIL example + the post-sealing PASS
cross-check); `test/fixtures/compute-map.js` (`blower-door-ach50` -> `computeBlowerDoorAch50` in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `air-changes-hour` / `ashrae-622-ventilation` /
`infiltration-load`); `data/search/aliases.json` ("blower door", "ach50", "air changes 50 pa", "air tightness",
"envelope leakage", "cfm50", "natural infiltration", "iecc air leakage"); the id appended to the existing hvacservice
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples and error seams (non-finite, volume / CFM50 / N-factor / target <= 0). Raise the
`calc-hvacservice.js` size cap if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the PASS and FAIL verdict paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the ACH50 / verdict / natural-ACH / natural-CFM
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (960 cfm50 / 12,800 ft^3 -> 4.5 ACH50,
FAIL, 56.5 cfm natural).

## 5. Roadmap position

Opens the air-tightness and ventilation batch (v218..v220). Its `cfm_nat` is the natural-infiltration airflow that
`ashrae-622-ventilation` (v219) takes as the infiltration credit and that `infiltration-load` (v220) drives through the
sensible/latent air-side factors. Pairs with the existing `air-changes-hour` (mechanical ACH vs 62.1) as its
envelope-side counterpart. A multi-point (multi-Pa) flow-exponent regression and an Equivalent Leakage Area (ELA)
sub-mode are deliberate future follow-ons.
