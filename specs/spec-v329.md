# roughlogic.com Specification v329 -- Whole-Building Heat-Loss Coefficient UA (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v329..v331 (the building-energy trio -- the whole-house
> numbers the single-assembly tiles never roll up: the building heat-loss coefficient UA (this spec), the annual heating
> energy from UA and degree-days (v330), and the through-wall condensation gradient (v331).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `assembly-r-value` gives one wall's parallel-path
> R-value, but an energy audit or a Manual J needs the whole envelope rolled into a single heat-loss coefficient -- the sum
> of every assembly's conductance plus the infiltration conductance, the `UA` that a degree-day energy estimate and a
> balance-point calc both start from. The catalog has no whole-building UA tile. Adds one tile to the existing
> **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v328.md.
>
> **The gap, and the evidence for it.** The building heat-loss coefficient is the sum of each assembly's area-over-R plus
> the infiltration conductance: `UA = sum(A_i / R_i) + 1.08 x CFM_infiltration`, in Btu/h per degF (the `1.08` being the
> sensible-air constant per cfm per degF). For a house with 1,200 ft^2 of R-17 wall, 1,500 ft^2 of R-38 ceiling, 200 ft^2
> of R-3 window, and 1,500 ft^2 of R-19 floor, the conduction sums to `70.6 + 39.5 + 66.7 + 78.9 = 255.7 Btu/h-degF`, and
> 50 cfm of natural infiltration adds `1.08 x 50 = 54.0`, for `UA = 309.7 Btu/h-degF` -- the number that, times the design
> temperature difference, is the design heating load, and times the degree-days is the annual energy. The window's low R
> dominates its small area, the intuition a whole-building roll-up makes visible. `assembly-r-value` sizes one wall; this
> tile sizes the whole envelope.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Each assembly area `A_i` is
an area (ft^2) and its `R_i` an R-value (h-ft^2-degF/Btu); the infiltration airflow is a volumetric flow (cfm); each
conductance and the total `UA` are Btu/h per degF; the optional design temperature difference gives the design load
(Btu/h). The v18/v21 contract: any non-finite input, or an area, R-value, or airflow at or below zero (R must be positive),
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the UA roll-up by name; `editionNote` names
**the heat-loss coefficient `UA = sum(A_i/R_i) + 1.08 x CFM`, the infiltration conductance from the sensible-air constant
`1.08 = 60 x 0.075 x 0.24`, the design load `Q = UA x dT`, and the ASHRAE Fundamentals / RESNET energy-audit basis**, and
states that **this returns the whole-building sensible heat-loss coefficient -- it sums the entered assemblies and a single
infiltration airflow (convert ACH50 to natural infiltration via an LBL/N-factor first, or enter the natural cfm), uses
clear-field assembly R-values (thermal bridging is captured only to the extent each `R_i` already accounts for it, e.g.
from `assembly-r-value`), and does not add the latent, ground-coupling, or solar terms; and this is an energy-audit aid,
not a stamped Manual J** -- the ACCA Manual J / RESNET analysis governs.

## 2. The tile

### 2.1 `building-ua` -- Whole-Building Heat-Loss Coefficient UA

```
inputs:
  assemblies[]  {A_ft2, R}   list of envelope assemblies (area, R-value)
  cfm_inf       cfm          natural infiltration airflow
  dT_F          degF         design temperature difference (optional, for load)

cond = sum(A_i / R_i)                             ; conduction conductance, Btu/h-degF
UA_inf = 1.08 * cfm_inf                           ; infiltration conductance, Btu/h-degF
UA = cond + UA_inf                                ; heat-loss coefficient, Btu/h-degF
design_load = UA * dT_F                           ; design heating load, Btu/h (if dT given)
```

**Pinned worked example (a small house, four assemblies + 50 cfm infiltration).** walls `1,200/17 = 70.6`, ceiling
`1,500/38 = 39.5`, windows `200/3 = 66.7`, floor `1,500/19 = 78.9` -> `cond = 255.7`; `UA_inf = 1.08 x 50 = 54.0`;
`UA = 309.7 Btu/h-degF`. At a `dT = 70 degF` design difference, the design load is `309.7 x 70 = 21,700 Btu/h`.
**Cross-check (tighten the house to 25 cfm and upgrade the windows to R-5).** windows now `200/5 = 40.0` (dropping the
window term 26.7) and `UA_inf = 1.08 x 25 = 27.0`: `UA = (70.6 + 39.5 + 40.0 + 78.9) + 27.0 = 256.0 Btu/h-degF` -- a 17% cut
in the load from air-sealing and better glass, the two biggest levers the roll-up exposes. The non-finite and non-positive
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","insulation","energy-audit"]`, matching `assembly-r-value`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the UA roll-up, `editionNote` naming
`UA = sum(A/R) + 1.08 CFM`, the infiltration conductance, `Q = UA dT`, and the sensible-only, enter-natural-cfm,
clear-field-R caveats); `test/fixtures/worked-examples.json` (the base house + the tightened cross-check);
`test/fixtures/compute-map.js` (`building-ua` -> `computeBuildingUa` in `../../calc-hvac.js`); `scripts/related-tiles.mjs`
(-> `assembly-r-value` / `degree-day-energy` / `infiltration-load` / `manual-j-heating`); `data/search/aliases.json`
("building UA", "heat loss coefficient", "whole house UA", "UA value", "envelope heat loss", "design heating load UA",
"sum A over R", "building load coefficient", "energy audit UA"); the id appended to the existing hvac renderers block in
`app.js`; the `// dims:` annotation (`A` area, `R` R-value, `cfm` volumetric flow, `UA` Btu/h-degF, load power);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the assembly summation, the
`1.08 CFM` infiltration term, the design-load product, and the non-positive / non-finite error seams. No new module; re-pin
`calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the summation and infiltration assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-assembly conductances and
the `UA` total wrap on a phone); render-no-nan + a11y sweep, output read to the value (four assemblies + 50 cfm -> 309.7
Btu/h-degF).

## 5. Roadmap position

Opens the building-energy batch (v329..v331) in `calc-hvac.js`, rolling the assemblies into one heat-loss coefficient. The
degree-day annual energy (v330) and the wall condensation gradient (v331) follow. An ACH50-to-natural-infiltration LBL
conversion, a latent/ground/solar term set, and a balance-point chain from the `UA` and internal gains are the deliberate
next follow-ons once the trio lands.
