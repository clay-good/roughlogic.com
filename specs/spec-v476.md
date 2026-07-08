# roughlogic.com Specification v476 -- Concrete Maturity and Equivalent Age (ASTM C1074) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-08; PROPOSED same day). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter, and the follow-on that spec-v247 §5 explicitly
> deferred: a maturity-method (ASTM C1074, time-temperature) strength-schedule estimate, the cold-weather-aware
> counterpart to the calendar-age curve of `concrete-strength-gain`. Adds one tile to **`calc-construction.js`**
> (Group E); no new module, group, or dependency. Inherits spec.md through spec-v475.md.
>
> **The gap, and the evidence for it.** The ACI 209 age curve that `concrete-strength-gain` carries assumes a standard
> moist cure -- and its own citation warns that "cold weather slows the gain the model does not see." The method the
> industry actually uses to see it is ASTM C1074 maturity: log the concrete temperature, accumulate the Nurse-Saul
> time-temperature factor M = Sum (Ta - T0) x dt, and compare it to the TTF the lab calibrated against the project's own
> mix. A 50 F week accrues 1,680 C-hr where a 68 F week accrues 3,360 -- the cold slab is not "7 days old," it is
> 3.8 equivalent days old, and every strip, shore-pull, post-tension, and open-to-traffic decision on a cold or hot pour
> turns on exactly that number. The catalog has the calendar curve (v247) and the placement screens (v245, v246) but
> nothing that converts a cure temperature and a clock into maturity, equivalent age, or the hours remaining to a
> calibrated target.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The temperatures (concrete,
datum, reference) are temperatures; the elapsed time and the equivalent age are times; the maturity index (a temperature
x time product) annotates as `T^2` under the SI-token dims convention (temperature maps to `T`); the Arrhenius activation
constant Q is a temperature (kelvin); the age-conversion factor is `dimensionless`. The v18/v21 contract: any non-finite
input, a non-positive elapsed time, a non-positive Q, a concrete temperature at or below the datum (no maturity accrues),
a reference temperature at or below the datum, or a negative target TTF returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the maturity method by name; `editionNote` names **ASTM C1074** and both of its
maturity functions -- the Nurse-Saul time-temperature factor with the recommended datum T0 = 0 C (32 F) for Type I cement
without admixtures cured 0 to 40 C, and the Arrhenius equivalent age with Q = 5000 K for the same case and the reference
temperature Tr = 20 C (68 F) that C1074 names as traditional (23 C is also permissible; both Q and Tr ship editable) --
and states that **the strength a TTF represents comes only from the lab-developed strength-maturity relationship for the
project's own materials and mix (the C1074 calibration procedure), intervals at or below the datum accrue no maturity,
and the method supplements rather than replaces acceptance cylinders** -- a scheduling estimate, not a strength
acceptance; the engineer of record and the project specification govern.

## 2. The tile

### 2.1 `concrete-maturity` -- Nurse-Saul TTF, Equivalent Age, and Hours to a Calibrated Target

```
inputs:
  concrete_temp_f   F        average in-place concrete temperature over the period
  hours             hr       elapsed curing time at that temperature
  datum_f           F        datum temperature T0 (default 32 F = 0 C, Type I no admixtures per C1074)
  q_kelvin          K        Arrhenius activation constant Q (default 5000 K, Type I no admixtures)
  ref_temp_f        F        equivalent-age reference temperature Tr (default 68 F = 20 C traditional)
  target_ttf_c      C-hr     optional: the mix's lab-calibrated target TTF to solve the hours for (0 = none)

Tc = (concrete_temp_f - 32) / 1.8      T0 = (datum_f - 32) / 1.8      Tr = (ref_temp_f - 32) / 1.8
M_c        = (Tc - T0) x hours                       # Nurse-Saul TTF, deg C-hr (single constant-temperature interval)
M_f        = 1.8 x M_c                               # the same TTF in deg F-hr
age_factor = exp(-Q x (1/(Tc+273.15) - 1/(Tr+273.15)))   # Arrhenius, temperatures in kelvin
te_hours   = age_factor x hours                      # equivalent age at Tr
target_hours = target_ttf_c / (Tc - T0)              # when a target TTF is given
```

**Pinned worked example (a 50 F cure week against a 1,600 C-hr strip target).** A slab holding 50 F (10 C) for
168 hours, datum 32 F, Q = 5000 K, reference 68 F: `M_c = 10 x 168 = ` **1,680 C-hr** (3,024 F-hr);
`age_factor = exp(-5000 x (1/283.15 - 1/293.15)) = 0.5475`, so `te = 0.5475 x 168 = ` **92.0 hours = 3.83 days** at
68 F -- the calendar says a week, the concrete says under four days. Against a lab-calibrated 1,600 C-hr strip target:
`target_hours = 1,600 / 10 = ` **160 hours** (6.7 days), so the cold pour reaches its target late on day 7 where a 68 F
cure would have reached it in 80. **Cross-check (a hot cure runs ahead).** The same mix at 90 F (32.2 C) for 72 hours:
`M_c = 32.222 x 72 = ` **2,320 C-hr**, `age_factor = 1.9791`, `te = ` **142.5 hours = 5.94 days** -- three calendar days
of hot cure carry nearly six days of equivalent age, which is why heated or summer pours strip early and why the same
TTF target arrives in half the clock time.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete","construction"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the maturity method, `editionNote` per §1); `test/fixtures/worked-examples.json`
(the 50 F example + the 90 F cross-check); `test/fixtures/compute-map.js` (`concrete-maturity` ->
`computeConcreteMaturity` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `concrete-strength-gain` /
`concrete-evaporation-rate` / `concrete-mix-design`); `data/search/aliases.json` ("concrete maturity", "maturity
method", "ASTM C1074", "nurse saul", "time temperature factor", "concrete equivalent age", "maturity meter", "cold
weather concrete strength"); the id appended to the existing construction renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and the error
seams (non-finite, hours <= 0, Q <= 0, concrete at or below the datum, reference at or below the datum, negative
target). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the TTF / equivalent-age / hours-to-target stack wraps on a
phone); render-no-nan + a11y on the new tile, output read to the value (50 F x 168 hr -> 1,680 C-hr, 3.83 equivalent
days).

## 5. Roadmap position

Executes the maturity-method follow-on that spec-v247 §5 named. Completes the cast-in-place cure-scheduling story:
`concrete-evaporation-rate` (v246) screens the placement, `concrete-strength-gain` (v247) gives the standard-cure
calendar estimate, and `concrete-maturity` gives the temperature-honest schedule the cold and hot pours actually run on.
The remaining v247 follow-on (a below-freezing gain adjustment) and a multi-interval TTF logger (summing a logged
temperature history) stay deliberate future follow-ons. Further Group E growth stays evidence-driven.
