# roughlogic.com Specification v384 -- Fan Affinity Laws (Speed / Diameter Change) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.135.0; proposed 2026-07-03). First tile of an HVAC airflow field-methods trio (v384 fan laws -> v385 pitot traverse
> CFM -> v386 measured percent outside air). `fan-motor-bhp` gives one operating-point horsepower; this tile scales the whole
> fan curve when the speed or wheel diameter changes -- the number a tech needs before slowing a fan on a VFD or swapping a
> sheave.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When a fan's speed changes (a VFD command or a pulley
> change), its airflow, static pressure, and brake horsepower all move together by the affinity laws: `Q2 = Q1*(N2/N1)`,
> `SP2 = SP1*(N2/N1)^2`, `BHP2 = BHP1*(N2/N1)^3`. The cube law on power is why a small speed cut saves so much energy, and
> why a small speed increase can overload a motor. No tile does this scaling. This adds the fan-law tile to the existing
> **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v383.md.
>
> **The gap, and the evidence for it.** A fan moving `10,000 CFM` at `1.0 in wg` on `5.0 BHP` at `900 rpm`, sped up to
> `1200 rpm` (ratio `1.333`), goes to `Q2 = 10000*1.333 = 13,333 CFM`, `SP2 = 1.0*1.333^2 = 1.78 in wg`, and
> `BHP2 = 5.0*1.333^3 = 11.85 BHP` -- a 33% speed rise more than doubles the horsepower and would trip a `10 hp` motor. Run
> it the other way (slow to save energy) and the cube law is the whole argument for a VFD. `fan-motor-bhp` and
> `pump-specific-speed` never scale across a speed change; this is the missing law.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The airflows are volumetric
flows (CFM); the static pressures are pressures (in wg); the brake horsepowers are powers (hp); the speeds `N1`/`N2` are
frequencies (rpm, treated as a ratio). The v18/v21 contract: any non-finite input, or a non-positive `N1`, returns
`{ error }`; the laws apply to a single fan on a fixed system curve (a geometrically similar diameter change uses the same
ratio form), and the tile reports the speed ratio and the three scaled outputs. Citation discipline (v19/v22):
`GOVERNANCE.general` over the fan affinity laws by name; `editionNote` names **the AMCA / ASHRAE fan laws
`Q2 = Q1*(N2/N1)`, `SP2 = SP1*(N2/N1)^2`, `BHP2 = BHP1*(N2/N1)^3` for a speed change on a fixed system, and the same-ratio
diameter form for geometrically similar fans**, and states that **this scales a known operating point to a new speed,
assumes a fixed system curve and constant air density and efficiency, that the cube law on power is the energy/overload
driver, and that it is a design aid, not a substitute for the fan performance table or a measured operating point**.

## 2. The tile

### 2.1 `fan-affinity-laws` -- Fan Affinity Laws (Speed / Diameter Change)

```
inputs:
  q1_cfm    cfm    baseline airflow
  sp1_inwg  in wg  baseline static pressure
  bhp1_hp   hp     baseline brake horsepower
  n1        rpm    baseline speed
  n2        rpm    new speed

r    = n2 / n1
q2   = q1_cfm  * r
sp2  = sp1_inwg * r^2
bhp2 = bhp1_hp * r^3
```

**Pinned worked example (10,000 CFM / 1.0 in wg / 5.0 BHP, 900 -> 1200 rpm).** ratio `r = 1.333`;
`Q2 = 13,333 CFM`, `SP2 = 1.78 in wg`, `BHP2 = 11.85 BHP` -- the 33% speed rise nearly `2.37x` the horsepower.
**Cross-check (slow to save energy).** The same fan at `r = 0.75` drops to `BHP2 = 5.0*0.75^3 = 2.11 BHP`, a 58% power cut
for a 25% speed reduction -- the VFD payback in one line. A non-positive `N1` takes the error path; the non-finite seam is
covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `fan-motor-bhp`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the AMCA/ASHRAE fan laws, `editionNote` naming the three relations and the
fixed-system assumption); `test/fixtures/worked-examples.json` (the speed-up example + the slow-down cross-check);
`test/fixtures/compute-map.js` (`fan-affinity-laws` -> `computeFanAffinityLaws` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `fan-motor-bhp` / `pump-specific-speed` / `vfd-energy-savings` / `duct-static-pressure-total`);
`data/search/aliases.json` ("fan affinity laws", "fan laws", "fan speed change cfm", "affinity laws", "fan bhp cube law",
"vfd fan airflow", "pulley change fan", "fan rpm scaling", "amca fan laws"); the id appended to the existing HVAC renderers
block in `app.js`; the `// dims:` annotation (CFM flow, SP pressure, BHP power, speeds ratio); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the cube law, and the non-positive / non-finite error
seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the three scaled outputs wrap on a phone); render-no-nan +
a11y sweep, output read to the value (900 -> 1200 rpm -> 13,333 CFM, 1.78 in wg, 11.85 BHP).

## 5. Roadmap position

Opens the HVAC airflow field-methods trio: `pitot-traverse-cfm` (v385) measures the airflow a fan is actually delivering,
and `outside-air-percent-temps` (v386) verifies the ventilation fraction in that airflow. A fan-and-system-curve
operating-point intersection tile is the deliberate next follow-on.
