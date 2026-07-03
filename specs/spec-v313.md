# roughlogic.com Specification v313 -- Steel Tape Distance Corrections (Temperature, Slope, Tension, Sag) (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v311..v313 (the field-surveying depth trio -- differential
> leveling (v311), stadia tacheometry (v312), taping corrections (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog reduces measured distances into
> coordinates but never corrects the raw taped distance for the field conditions that bias it -- temperature, slope,
> tension, and sag. A steel tape read on a hot day, over a grade, or unsupported reads systematically wrong, and the
> corrections are the difference between a rough measurement and survey-grade distance. Adds one tile to the existing
> **`calc-survey.js`** module (Group P); no new group, trade, or dependency. Inherits spec.md through spec-v312.md.
>
> **The gap, and the evidence for it.** A steel tape's corrected distance is the measured length plus four standard
> corrections: temperature `Ct = alpha (T - T0) L` (`alpha = 6.45e-6 /degF` for steel), slope `Ch = -h^2/(2L)` (reducing a
> slope distance to horizontal), tension/pull `Cp = (P - P0) L/(A E)`, and sag `Cs = -w^2 L^3/(24 P^2)` (for an unsupported
> span). For a 100 ft measurement taped at 95 degF (standardized at 68 degF) down a 3 ft grade, the temperature correction
> is `+0.017 ft` (a hot tape stretched, so it read short) and the slope correction is `-0.045 ft`, giving a corrected
> horizontal distance of `99.972 ft` -- the survey-grade number, three hundredths shorter than the tape read, the systematic
> error that accumulates across a traverse. The coordinate tiles assume a clean distance; this tile cleans it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The measured length `L`, the
elevation difference `h`, and the corrected distance are lengths (ft); the temperatures `T`, `T0` are temperatures (degF);
the coefficient `alpha` is per-degF; the pulls `P`, `P0` are forces (lb); the tape cross-section `A` (in^2) and modulus `E`
(psi) size the tension term; the weight per length `w` is a force per length (lb/ft); each correction and their sum are
lengths (ft). The v18/v21 contract: any non-finite input, or a length or (for the sag/tension terms) a tension at or below
zero, returns `{ error }`; corrections whose inputs are omitted default to zero. Citation discipline (v19/v22):
`GOVERNANCE.general` over the taping-correction formulas by name; `editionNote` names **the temperature
`Ct = alpha (T - T0) L` (`alpha = 6.45e-6 /degF` steel), slope `Ch = -h^2/(2L)`, tension `Cp = (P - P0) L/(A E)`, and sag
`Cs = -w^2 L^3/(24 P^2)` corrections, added to the measured length, as compiled in the surveying references (Ghilani/Wolf)**,
and states that **this returns the corrected horizontal distance for a steel tape -- the slope correction uses the
approximate `-h^2/(2L)` (exact `sqrt(L^2 - h^2)` for steep grades), the sag term applies only to an unsupported span (zero
when the tape is fully supported), and it does not cover the tape's own standardization/index error (a separate calibration
constant); and this is a computational aid** -- the tape's calibration and the field procedure govern.

## 2. The tile

### 2.1 `taping-corrections` -- Steel Tape Distance Corrections

```
inputs:
  L_ft      ft      measured (recorded) length
  T_F       degF    field temperature (optional)
  T0_F      degF    tape standardization temperature (default 68)
  h_ft      ft      elevation difference over the span (optional, slope)
  P_lb      lb      applied pull (optional, tension/sag)
  P0_lb     lb      standardization pull (optional)
  A_in2     in^2    tape cross-section (optional, tension)
  w_plf     lb/ft   tape weight per foot (optional, sag)
  alpha     /degF   thermal coefficient (default 6.45e-6 steel)
  E_psi     psi     tape modulus (default 29e6)

Ct = alpha * (T_F - T0_F) * L_ft
Ch = -h_ft^2 / (2 * L_ft)
Cp = (P_lb - P0_lb) * L_ft / (A_in2 * E_psi)
Cs = -w_plf^2 * L_ft^3 / (24 * P_lb^2)
corrected = L_ft + Ct + Ch + Cp + Cs
```

**Pinned worked example (a 100 ft tape at 95 degF down a 3 ft grade, temperature and slope only).** `L = 100`, `T = 95`,
`T0 = 68`, `h = 3`, `alpha = 6.45e-6`: `Ct = 6.45e-6 x (95 - 68) x 100 = +0.017 ft` (the warm tape expanded, so it read
short and the correction adds); `Ch = -3^2/(2 x 100) = -0.045 ft`; corrected `= 100 + 0.017 - 0.045 = 99.972 ft`.
**Cross-check (a cold tape, 40 degF, on level ground).** `T = 40`, `h = 0`: `Ct = 6.45e-6 x (40 - 68) x 100 = -0.018 ft`
(a cold tape shrank, so it read long and the correction subtracts), corrected `= 99.982 ft` -- the temperature correction
flips sign with the temperature, the systematic bias that a single warm-day traverse carries throughout. The non-finite and
non-positive error paths bracket the result, with omitted corrections defaulting to zero.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying","field"]`, matching the survey tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the taping-correction formulas, `editionNote` naming the four
corrections, `alpha = 6.45e-6`, and the approximate-slope, unsupported-sag, no-standardization caveats);
`test/fixtures/worked-examples.json` (the hot-downgrade example + the cold-level cross-check);
`test/fixtures/compute-map.js` (`taping-corrections` -> `computeTapingCorrections` in `../../calc-survey.js`);
`scripts/related-tiles.mjs` (-> `differential-leveling` / `stadia-distance` / `traverse-closure` / `pacing-distance`);
`data/search/aliases.json` ("taping corrections", "tape temperature correction", "slope correction tape", "sag correction",
"tension correction tape", "steel tape distance", "chaining corrections", "reduce to horizontal", "survey tape error");
the id appended to the existing survey renderers block in `app.js`; the `// dims:` annotation (lengths ft, temps
temperature, pulls force, `A` area, `w` force/length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the sign flip of `Ct` with temperature, the omitted-corrections-default-to-zero behavior, and the
non-positive / non-finite error seams. No new module; re-pin `calc-survey.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the temperature-sign assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the four corrections and the corrected
distance wrap on a phone); render-no-nan + a11y sweep, output read to the value (100 ft, 95 degF, 3 ft grade -> 99.972 ft).

## 5. Roadmap position

Closes the field-surveying depth batch (v311..v313) in `calc-survey.js`: leveling, stadia, and taping corrections now stand
beside the traverse and coordinate tiles. The exact `sqrt(L^2 - h^2)` slope reduction, the tape standardization/index
constant, and the normal-tension (self-cancelling pull-versus-sag) solution are the deliberate next follow-ons once the
trio lands.
