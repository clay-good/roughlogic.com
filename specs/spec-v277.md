# roughlogic.com Specification v277 -- Demand-Controlled Ventilation Rate from a CO2 Setpoint (Steady-State Mass Balance) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.98.0; proposed 2026-07-02). Batch spec-v275..v277 (the ventilation-and-recovery trio -- recover
> (v275), temper (v276), modulate (this spec)). This tile turns an indoor CO2 setpoint into the outdoor airflow per person
> a demand-controlled ventilation system must deliver, and back-checks the steady-state CO2 a given airflow settles at.**
> In-scope catalog expansion under the spec-v106 trades-only charter: HVAC controls and commissioning routinely tune
> demand-controlled ventilation (DCV) to a CO2 setpoint, and the catalog already computes the fixed residential and
> outdoor-air rates (`ashrae-622-ventilation`, `outdoor-air-ventilation`, `outdoor-air-mix`), but nothing relates a CO2
> setpoint to the per-person airflow that holds it -- the single-zone steady-state mass balance a controls tech uses to set
> the DCV reset. Adds one tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency.
> Inherits spec.md through spec-v276.md.
>
> **The gap, and the evidence for it.** In a fully mixed zone at equilibrium, the indoor CO2 concentration settles at
> `C_in = C_oa + N / Q`, where `N` is the CO2 a person exhales (about `0.0106 ft^3/min` for sedentary office work),
> `C_oa` is the outdoor CO2 (about 400 ppm today), and `Q` is the outdoor airflow per person. Solving for the airflow that
> holds a setpoint gives `Q = N / (C_set - C_oa)` with the concentrations as volume fractions. For a 1,100 ppm setpoint
> against 400 ppm outdoor air, `Q = 0.0106 / ((1100 - 400) / 1,000,000) = 15.1 ft^3/min per person` -- the classic
> office ventilation rate, and the reset a DCV control drives the damper toward as the CO2 sensor climbs. Back-substituting,
> a 15.1 cfm/person zone settles at exactly 1,100 ppm, and a 20-person space needs 303 cfm of outdoor air.
> `ashrae-622-ventilation` and `outdoor-air-ventilation` give the fixed design rate; this tile gives the CO2-driven
> modulated rate the controls actually run.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The per-person CO2 generation
`N` and the per-person outdoor airflow `Q` are volumetric flows (ft^3/min); the indoor setpoint, outdoor, and steady-state
CO2 concentrations `C_set`, `C_oa`, `C_in` are entered in parts per million (dimensionless volume fractions); the occupancy
`n` is a dimensionless count; the total outdoor airflow is a volumetric flow (ft^3/min). The v18/v21 contract: any non-finite
input, a generation rate at or below zero, an occupancy at or below zero, or a setpoint that does not exceed the outdoor
concentration (`C_set <= C_oa`, where no finite airflow can hold the setpoint) returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the single-zone CO2 mass-balance by name; `editionNote` names **the steady-state
single-zone CO2 mass balance `C_in = C_oa + N / Q`, solved for the per-person outdoor airflow `Q = N / (C_set - C_oa)`, with
the ASHRAE 62.1 note that CO2 is an indicator of occupant-generated bioeffluents and a common sedentary generation rate of
about `0.0106 ft^3/min` per person**, and states that **this returns the equilibrium (fully mixed, steady-state) airflow --
it is the airflow that eventually holds the setpoint, not the transient buildup or decay time (which depends on the room
volume and air-change rate), assumes a single fully mixed zone at one occupancy, uses a fixed metabolic generation rate,
and treats CO2 as an occupancy indicator rather than the ventilation design basis (the ASHRAE 62.1 Ventilation Rate
Procedure governs the minimum outdoor air); and this is a design/commissioning aid, not a substitute for the mechanical
engineer's ventilation design** -- the ASHRAE 62.1 rate procedure and the engineer of record govern the minimum.

## 2. The tile

### 2.1 `dcv-co2-ventilation` -- Demand-Controlled Ventilation Rate from a CO2 Setpoint

```
inputs:
  n           -          occupancy (number of people)
  co2_set_ppm ppm        indoor CO2 setpoint to hold
  co2_oa_ppm  ppm        outdoor CO2 concentration (~400 ppm)
  gen_cfm     ft^3/min   per-person CO2 generation (default 0.0106, sedentary)

dC_frac   = (co2_set_ppm - co2_oa_ppm) / 1e6          ; setpoint above outdoor, fraction
Q_person  = gen_cfm / dC_frac                         ; outdoor airflow per person, cfm
Q_total   = Q_person * n                              ; total outdoor airflow, cfm
co2_check = co2_oa_ppm + gen_cfm / Q_person * 1e6     ; steady-state CO2 back-check, ppm
```

**Pinned worked example (a 20-person office, 1,100 ppm setpoint, 400 ppm outdoor, sedentary generation).** `n = 20`,
`co2_set = 1100`, `co2_oa = 400`, `gen = 0.0106`: `dC = (1100 - 400)/1e6 = 0.0007`;
`Q_person = 0.0106 / 0.0007 = 15.1 ft^3/min per person` (the canonical office rate); `Q_total = 15.1 * 20 = 303 cfm`; the
back-check `co2 = 400 + 0.0106 / 15.1 * 1e6 = 1,100 ppm`, closing the loop. **Cross-check (tighten the setpoint to
800 ppm).** Hold everything else: `dC = (800 - 400)/1e6 = 0.0004`; `Q_person = 0.0106 / 0.0004 = 26.5 cfm/person`;
`Q_total = 26.5 * 20 = 530 cfm` -- a tighter setpoint (400 ppm above outdoor instead of 700) demands `1.75x` the airflow,
the reset the DCV control drives when the space is called to a fresher setpoint. The non-finite, `n <= 0`, `gen <= 0`, and
`C_set <= C_oa` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, matching the ventilation tiles); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the steady-state single-zone CO2 mass balance, `editionNote` naming
`C_in = C_oa + N/Q` and `Q = N/(C_set - C_oa)`, the ASHRAE 62.1 CO2-as-indicator note, and the equilibrium-only,
single-zone, fixed-generation, not-the-design-basis caveats); `test/fixtures/worked-examples.json` (the 20-person 1,100 ppm
example + the 800 ppm cross-check); `test/fixtures/compute-map.js` (`dcv-co2-ventilation` -> `computeDcvCo2Ventilation` in
`../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `outdoor-air-ventilation` / `ashrae-622-ventilation` /
`outdoor-air-mix` / `erv-sensible-recovery`); `data/search/aliases.json` ("DCV", "demand controlled ventilation", "CO2
setpoint", "CO2 ventilation rate", "cfm per person", "how much outdoor air per person", "CO2 based ventilation", "ASHRAE
CO2", "occupancy ventilation"); the id appended to the existing hvac renderers block in `app.js`; the `// dims:` annotation
(`gen`/`Q` volumetric flow, `n` dimensionless, concentrations dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the steady-state back-check identity, the `1/(C_set-C_oa)` scaling, and
the three error seams (non-finite, `n <= 0` / `gen <= 0`, `C_set <= C_oa`). No new module; re-pin `calc-hvac.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the back-check identity assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Q_person` / `Q_total` / `co2_check`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (20 people at 1,100 ppm -> 15.1 cfm/person,
303 cfm total).

## 5. Roadmap position

Closes the ventilation-and-recovery batch (v275..v277) in `calc-hvac.js`: the outdoor air is recovered (v275), tempered
(v276), and now modulated to a CO2 setpoint. A transient CO2 buildup/decay time from the room volume and air-change rate,
the ASHRAE 62.1 multi-zone Ventilation Rate Procedure with its system ventilation efficiency, and a variable metabolic
generation rate by activity level are the deliberate next follow-ons once the trio lands. With this trio the ventilation
cluster in `calc-hvac.js` stands beside the load-calculation, duct, and refrigerant clusters.
