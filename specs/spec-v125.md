# roughlogic.com Specification v125 -- Conductor Short-Circuit Thermal Withstand (Onderdonk / ICEA) (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-23 (package 0.73.0; part of catalog 600 -> 608). Batch spec-v121..v128.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one electrical tile from the public-domain Onderdonk adiabatic-
> heating equation (ICEA P-32-382 form), engineering-study governed, redo-not-harm. Adds one tile to
> **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v124.md.
>
> **The gap, and the evidence for it.** The catalog computes available fault current
> (`short-circuit-pp`) and sizes the equipment grounding conductor by overcurrent rating
> (`egc-sizing`), but never closes the loop: will the conductor itself survive that fault current
> for the protective device's clearing time without exceeding its insulation's short-circuit
> temperature? The Onderdonk / ICEA withstand check answers that, and it is the screen that flags an
> undersized grounded or grounding conductor on a high-fault service.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Conductor area is in circular mils (an area, `L^2`), fault current is electric current (amperes),
clearing time is `T`, and the initial / final temperatures are temperature `T` (the temperature-
ratio term inside the base-10 log is `dimensionless`). The bundled material constants (0.0297 and
234 for copper, 0.0125 and 228 for aluminum) carry the cmil / ampere / second unit bridge and are
annotated editable fields. The v18/v21 contract: any non-finite input, a non-positive area, fault
current, or clearing time, or a final temperature not greater than the initial temperature, returns
`{ error }`; the only divisions are by a guarded-positive clearing time and a guarded-positive log
term. Citation discipline (v19/v22): `GOVERNANCE.general` over the ICEA / Onderdonk relation
`(I/A)^2 t = K log10((T2 + B)/(T1 + B))`, by name; the protective-device time-current curve and an
engineered study govern the final determination -- this tile is a thermal-withstand screen, not a
substitute for that study.

## 2. The tile

### 2.1 `conductor-short-circuit-withstand` -- Onderdonk / ICEA Adiabatic Withstand

```
inputs:
  area_cmil          L^2            conductor area in circular mils
  fault_current_a    I              available symmetrical fault current
  clearing_time_s    T              protective-device total clearing time
  material           enum           copper (K=0.0297, B=234) or aluminum (K=0.0125, B=228)
  t_initial_c        T              conductor temp at fault onset (default 75)
  t_final_c          T              insulation short-circuit limit (default 250 for thermoplastic)

C            = K x log10((t_final_c + B) / (t_initial_c + B))
withstand_a  = area_cmil x sqrt(C / clearing_time_s)            # max current the size survives
min_cmil     = fault_current_a x sqrt(clearing_time_s / C)      # min size for the actual fault
verdict: withstand_a >= fault_current_a -> adequate ; else undersized, size up to min_cmil
```

**Pinned worked example.** Copper #6 AWG (26,240 cmils), 75 C initial, 250 C final, 0.1 s clearing,
10,000 A fault: `C = 0.0297 x log10((250+234)/(75+234)) = 0.0297 x log10(1.566) = 0.005789`;
`withstand = 26,240 x sqrt(0.005789/0.1) = 26,240 x 0.2406 = 6,313 A` -- **inadequate** against
10,000 A; `min_cmil = 10,000 x sqrt(0.1/0.005789) = 41,560 cmils` -> #4 AWG (41,740 cmils) or
larger. **Cross-check (aluminum).** Same 26,240 cmils in aluminum:
`C = 0.0125 x log10((250+228)/(75+228)) = 0.002475`, `withstand = 26,240 x sqrt(0.002475/0.1) =
4,128 A` -- aluminum's lower constant gives a lower withstand for the same area, as expected. An
engineered study and the device clearing curve govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the ICEA / Onderdonk formula and both material constant
pairs listed, `editionNote` noting the ICEA P-32-382 / Onderdonk public-domain origin and the
screen-not-study scope); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`conductor-short-circuit-withstand` ->
`computeConductorShortCircuitWithstand` in `../../calc-electrical.js`); `scripts/related-tiles.mjs`
(-> `short-circuit-pp` / `egc-sizing` / `conductor-resistance`); `data/search/aliases.json`
("short circuit withstand", "onderdonk", "icea", "thermal withstand", "minimum conductor for
fault", "i squared t"); the id appended to the existing `ELECTRICAL_RENDERERS` declare in `app.js`;
the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning the example, cross-check, and error seams (non-finite, area / current / time <= 0,
t_final <= t_initial). Raise the `calc-electrical.js` size cap by ~20 percent if needed (dated
comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the withstand, min-cmil, and
verdict lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (Cu #6 / 0.1 s
-> 6,313 A withstand, 41,560 cmil minimum vs a 10,000 A fault).

## 5. Roadmap position

Closes the fault-survivability loop with `short-circuit-pp` (how much fault) and `egc-sizing` (table
minimum). Further Group A growth stays evidence-driven.
