# roughlogic.com Specification v116 -- Water Disinfection: Chlorine Demand / Breakpoint and UV Dose (calc-water.js, Group M, 2 New Tiles)

> **Status: SPECIFIED 2026-06-20, awaiting an execution pass.** In-scope catalog expansion under
> the spec-v106 charter: two water/wastewater-operator tiles from public Standard Methods / AWWA /
> USEPA relations, state-primacy governed, redo-not-harm. Adds two tiles to **`calc-water.js`**
> (Group M); no new module, group, or dependency. Inherits spec.md through spec-v115.md.
>
> **The gap, and the evidence for it.** Group M computes the dose for a target residual
> (`Pounds Formula`), residual loss over time (`Chlorine Residual Decay`), and pathogen credit
> (`Disinfection CT`), but never the operator's daily back-calculation of chlorine *demand*
> (applied minus residual) or the *UV dose* an alternative-disinfection plant validates. Both are
> distinct from anything live.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Concentrations are mass-per-volume (`M L^-3`), UV intensity is power-per-area (`M T^-3`), time is
`T`, and UV dose is energy-per-area (`M T^-2`). Bundled defaults (the ~7.6:1 Cl2:NH3-N breakpoint
ratio note, the 40 mJ/cm^2 default target dose) are annotated editable fields. The v18/v21
contract: any non-finite input, a negative concentration, or a non-positive intensity or time
returns `{ error }`. Citation discipline (v19/v22): `chlorine-demand` cites Standard Methods
4500-Cl and AWWA M14 (demand = applied minus residual); `uv-dose` cites the USEPA UV Disinfection
Guidance Manual (dose = intensity x time). The state primacy agency and the validated reactor
rating govern.

## 2. The tiles

### 2.1 `chlorine-demand` -- Chlorine Demand and Dose for a Target Residual

```
inputs:
  applied_mg_l        M L^-3   chlorine applied
  measured_residual_mg_l M L^-3 measured residual
  target_residual_mg_l M L^-3  desired residual (for the dose recommendation)

demand_mg_l       = applied_mg_l - measured_residual_mg_l
dose_for_target   = demand_mg_l + target_residual_mg_l
note: a high or rising demand suggests ammonia/organics; check breakpoint (free vs combined chlorine)
```

**Pinned worked example.** Applied 3.0 mg/L, residual 0.8 mg/L: `demand = 2.2 mg/L`; to hold a 1.0
mg/L target, `dose_for_target = 3.2 mg/L`. **Cross-check:** applied 5.0, residual 0.5 -> demand
4.5 mg/L (high; check for ammonia / breakpoint), dose for a 1.0 target = 5.5 mg/L. The compliance
residual and method are set by the state primacy agency.

### 2.2 `uv-dose` -- UV Dose and Target Check

```
inputs:
  intensity_mw_cm2    M T^-3        measured / reactor UV intensity
  exposure_time_s     T             exposure (residence) time
  target_dose_mj_cm2  M T^-2        required validated dose (default 40)

dose_mj_cm2 = intensity_mw_cm2 x exposure_time_s     # mW.s/cm^2 = mJ/cm^2
verdict: dose_mj_cm2 >= target_dose_mj_cm2 -> meets target ; else short
```

**Pinned worked example.** 10 mW/cm^2 for 5 s -> `dose = 50 mJ/cm^2` >= 40 -> meets the target.
**Cross-check:** 6 mW/cm^2 for 5 s -> `dose = 30 mJ/cm^2` < 40 -> short (check lamp age / UV
transmittance). The validated reactor dose and the state primacy agency govern.

## 3. Wiring

Per tile: a `tools-data.js` row (group `M`, trade `["water"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`chlorine-demand` -> Standard Methods 4500-Cl / AWWA M14; `uv-dose` -> USEPA
UV Disinfection Guidance Manual); worked-examples fixtures (each example + cross-check);
`compute-map.js` (`chlorine-demand` -> `computeChlorineDemand`, `uv-dose` -> `computeUvDose`, both
in `../../calc-water.js`); `related-tiles.mjs` (`chlorine-demand` -> `pounds-formula` /
`chlorine-residual-decay` / `disinfection-ct`; `uv-dose` -> `disinfection-ct` / `chlorine-demand`);
`data/search/aliases.json` (`chlorine-demand`: "chlorine demand", "applied minus residual",
"breakpoint chlorination", "dose for residual"; `uv-dose`: "uv dose", "ultraviolet disinfection",
"uv intensity time", "mj/cm2"); the two ids appended to the existing `WATER_RENDERERS` declare in
`app.js`; the `// dims:` annotations; regenerated corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, cross-checks, and error seams. Raise the `calc-water.js` size cap by
~20 percent if needed; bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` **+2 tiles**);
`npm test` (+4 fixtures, the new fuzzer block); `npm run build` (two new shells, regenerated
sitemap); `data:verify`; worked-examples runner; 320 px audit (the demand and dose lines wrap);
render-no-nan + a11y sweep, output read to the value (applied 3.0 / residual 0.8 -> demand 2.2;
10 mW/cm^2 x 5 s -> 50 mJ/cm^2).

## 5. Roadmap position

Rounds out the disinfection family with the demand back-calculation and the UV-plant dose check.
Further Group M growth stays evidence-driven (lime-softening caustic demand and iron/manganese
oxidation contact time are noted candidates for a later evidence-driven pass).
