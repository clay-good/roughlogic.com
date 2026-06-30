# roughlogic.com Specification v219 -- ASHRAE 62.2 Whole-House Mechanical Ventilation Rate (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v218..v220 (the residential air-tightness and ventilation trio -- the
> blower-door result, the ASHRAE 62.2 whole-house ventilation the tight house then needs, and the infiltration load).
> This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the whole-house ventilation fan is sized and
> installed by the HVAC tech. Adds one tile to **`calc-hvacservice.js`** (Group C); no new module, group, or dependency.
> Inherits spec.md through spec-v218.md.
>
> **The gap, and the evidence for it.** `outdoor-air-ventilation` sizes ASHRAE 62.1 breathing-zone outdoor air -- the
> commercial standard, keyed to occupancy and floor area with the user's Rp/Ra. But residential whole-house ventilation
> is a different standard with a different equation: **ASHRAE 62.2**, where the total required ventilation is set only
> by the conditioned floor area and the bedroom count (`Qtot = 0.03 * CFA + 7.5 * (Nbr + 1)`), and the *fan* the
> installer must provide is that total minus the credit for the air the envelope already leaks. This is the tile that
> closes the loop the blower-door (v218) opens: the tighter the house tests, the smaller the infiltration credit, and
> the more mechanical ventilation 62.2 requires the tech to add back. The catalog can size 62.1 commercial OA but has
> no 62.2 residential whole-house number, so it cannot tell a tech what continuous fan a house they just air-sealed now
> needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The conditioned floor
area is an area (`L^2`, ft^2); the total required ventilation, the infiltration credit, and the required fan airflow are
an airflow (`L^3 T^-1`, cfm); the bedroom count is `dimensionless`. The 0.03 cfm/ft^2 and 7.5 cfm/person are the
ASHRAE 62.2 rate coefficients (an airflow per area and an airflow per implied occupant; carried as the standard's named
constants, not re-derived). The v18/v21 contract: any non-finite input, a non-positive floor area, a negative bedroom
count or infiltration credit, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the 62.2
total-and-fan relations by name; `editionNote` names **ASHRAE 62.2-2019 §4.1** (`Qtot = 0.03 * Afloor + 7.5 * (Nbr + 1)`,
and the fan flow `Qfan = Qtot - Qinf` where `Qinf` is the infiltration credit), and states that **the bedroom count is
the standard's occupancy proxy (occupants assumed = Nbr + 1), the infiltration credit comes from the measured
air-tightness per the 62.2 infiltration method (the conservative default is zero credit -- size the fan to the full
Qtot), local exhaust (kitchen and bath) is a separate 62.2 requirement this tile does not cover, and this is a sizing
aid, not a 62.2 compliance certificate** -- the continuous-fan target, not the rater's signed form.

## 2. The tile

### 2.1 `ashrae-622-ventilation` -- Whole-House Mechanical Ventilation Rate (ASHRAE 62.2)

```
inputs:
  floor_area_ft2      L^2            conditioned floor area (CFA), ft^2
  bedrooms            dimensionless  number of bedrooms (Nbr); occupants assumed Nbr + 1
  infil_credit_cfm    L^3 T^-1       infiltration credit Qinf, cfm (from blower-door cfm_nat; default 0 = conservative)

q_tot   = 0.03 * floor_area_ft2 + 7.5 * (bedrooms + 1)     # ASHRAE 62.2-2019 Eq. 4.1a, total required, cfm
q_fan   = max(0, q_tot - infil_credit_cfm)                  # continuous mechanical-ventilation fan flow, cfm
verdict = q_fan > 0
            ? "Continuous whole-house fan required"
            : "Infiltration credit meets Qtot -- no continuous fan required by 62.2"
```

**Pinned worked example (2,000 ft^2, 3-bedroom, no credit).** A 2,000 ft^2 three-bedroom house, sized conservatively
with no infiltration credit (the default): `q_tot = 0.03 * 2,000 + 7.5 * (3 + 1) = 60 + 30 = 90 cfm`;
`q_fan = max(0, 90 - 0) = ` **90 cfm of continuous whole-house ventilation**. **Cross-check (same house, with the
blower-door infiltration credit).** Take the natural infiltration from the post-sealing blower-door retest in v218
(`cfm_nat = 35.3`, used here as the 62.2 credit): `q_tot = 90` (unchanged -- it depends only on area and bedrooms);
`q_fan = max(0, 90 - 35.3) = ` **54.7 cfm**. The tightening that passed the IECC code line in v218 did not change the
62.2 *total* -- that is fixed by the floor plan -- but it shrank the infiltration credit, so the mechanical fan the
installer must add grew from what a leaky house would have offset. This is the trade-off 62.2 is built around: a tight
envelope is healthier and cheaper to condition, but it obligates a sized, continuous ventilation fan rather than
relying on the cracks.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac","weatherization"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the 62.2 total-and-fan relations, `editionNote` naming ASHRAE 62.2-2019 §4.1 with the
occupancy-proxy / infiltration-credit / local-exhaust-separate / not-a-certificate caveats);
`test/fixtures/worked-examples.json` (the no-credit example + the with-credit cross-check);
`test/fixtures/compute-map.js` (`ashrae-622-ventilation` -> `computeAshrae622Ventilation` in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `blower-door-ach50` / `outdoor-air-ventilation` /
`air-changes-hour`); `data/search/aliases.json` ("62.2", "whole house ventilation", "ashrae 62.2", "qtot",
"residential ventilation", "continuous ventilation fan", "erv sizing", "exhaust fan ventilation rate"); the id appended
to the existing hvacservice renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, floor area <= 0, negative
bedrooms / credit, the credit-meets-Qtot zero-fan path). Raise the `calc-hvacservice.js` size cap if needed (dated
comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the zero-fan verdict path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the Qtot / credit / fan / verdict stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (2,000 ft^2 / 3 br / no credit -> 90 cfm fan).

## 5. Roadmap position

The middle of the air-tightness and ventilation batch (v218..v220). Consumes the `cfm_nat` that `blower-door-ach50`
(v218) produces as its infiltration credit, and sits beside `outdoor-air-ventilation` (the 62.1 commercial counterpart)
and `air-changes-hour`. The 62.2 local-exhaust (kitchen/bath) minimums and the multi-family compartmentalization credit
are deliberate future follow-ons.
