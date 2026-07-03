# roughlogic.com Specification v321 -- Refrigeration Coefficient of Performance and Carnot Limit (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v320..v322 (the refrigeration-cycle trio -- mass flow (v320),
> the coefficient of performance (this spec), condenser heat of rejection (v322)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog converts SEER/EER (`seer-eer`) but has no
> tile for the fundamental cycle efficiency -- the coefficient of performance, the ratio of cooling delivered to compressor
> work off the P-h diagram, and its Carnot ceiling. COP is how a tech judges a cycle's health and compares it to the
> theoretical best. Adds one tile to the existing **`calc-refrigerant.js`** module (Group C); no new group, trade, or
> dependency. Inherits spec.md through spec-v320.md.
>
> **The gap, and the evidence for it.** The cooling coefficient of performance is the refrigeration effect over the
> compressor work, `COP = (h1 - h4)/(h2 - h1)`, where `h1` is the suction enthalpy, `h4` the evaporator-inlet enthalpy, and
> `h2` the compressor-discharge enthalpy. The thermodynamic ceiling is the Carnot COP,
> `COP_Carnot = T_evap/(T_cond - T_evap)` in absolute temperature, and the ratio of the two is the cycle's second-law
> efficiency. For a cycle with a `60 Btu/lb` refrigeration effect and `25 Btu/lb` of compressor work, `COP = 60/25 = 2.4`;
> against a Carnot limit of `500/(580 - 500) = 6.25` for a 40 degF evaporator and 120 degF condenser, the cycle runs at
> `2.4/6.25 = 38%` of ideal -- the efficiency number a designer improves by lowering the lift (raising evaporator, lowering
> condenser temperature). `seer-eer` rates the equipment; this tile reads the cycle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The enthalpies `h1`, `h2`,
`h4` and the refrigeration effect and compressor work are specific energies (Btu/lb); the evaporator and condenser
temperatures `T_evap`, `T_cond` are temperatures (entered degF, converted to Rankine for the Carnot ratio); the COP, Carnot
COP, and second-law efficiency are dimensionless. The v18/v21 contract: any non-finite input, a compressor work at or below
zero (`h2 <= h1`), a refrigeration effect at or below zero, or `T_cond <= T_evap` returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the COP definitions by name; `editionNote` names **the cooling COP
`COP = (h1 - h4)/(h2 - h1)`, the Carnot limit `COP_Carnot = T_evap/(T_cond - T_evap)` (absolute temperature), the second-law
efficiency `COP/COP_Carnot`, and the relation `EER = 3.412 x COP`**, and states that **this returns the cycle COP, its
Carnot ceiling, and the second-law efficiency -- it uses the enthalpies from the P-h diagram (provide them), takes the
ideal (isentropic-work) or actual work as entered, uses saturation temperatures for the Carnot lift, and does not add the
motor/drive or parasitic loads (the system COP is lower); and this is an engineering aid** -- the refrigerant property data
and measured state points govern.

## 2. The tile

### 2.1 `refrigeration-cop` -- Refrigeration COP and Carnot Limit

```
inputs:
  h1_btulb   Btu/lb   suction enthalpy (evaporator out)
  h2_btulb   Btu/lb   discharge enthalpy (compressor out)
  h4_btulb   Btu/lb   evaporator-inlet enthalpy
  Tevap_F    degF     evaporator saturation temperature
  Tcond_F    degF     condenser saturation temperature

RE = h1 - h4 ; W = h2 - h1
COP = RE / W
COP_carnot = (Tevap_F + 459.67) / ((Tcond_F + 459.67) - (Tevap_F + 459.67))
eta_2nd = COP / COP_carnot
EER = 3.412 * COP
```

**Pinned worked example (RE = 60, W = 25 Btu/lb; 40 degF evaporator, 120 degF condenser).** `h1 = 180`, `h2 = 205`,
`h4 = 120`: `COP = 60/25 = 2.40`; `EER = 3.412 x 2.40 = 8.19`; Carnot
`COP_carnot = 499.67/(579.67 - 499.67) = 499.67/80 = 6.25`; second-law `eta = 2.40/6.25 = 0.38` (38% of ideal).
**Cross-check (drop the lift by raising the evaporator to 45 degF).** Hold the state enthalpies but recompute Carnot at
`T_evap = 45 degF`: `COP_carnot = 504.67/(579.67 - 504.67) = 504.67/75 = 6.73` -- a smaller lift raises the ceiling, the
reason a flooded/higher evaporator and a cooler condenser are the levers a tech pulls for efficiency. The non-finite,
`h2 <= h1`, `h1 <= h4`, and `T_cond <= T_evap` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","refrigeration"]`, matching the refrigerant tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the COP definitions, `editionNote` naming
`COP = (h1 - h4)/(h2 - h1)`, the Carnot limit, the second-law efficiency, `EER = 3.412 COP`, and the P-h-enthalpy,
saturation-temperature, no-parasitic caveats); `test/fixtures/worked-examples.json` (the base example + the lower-lift
cross-check); `test/fixtures/compute-map.js` (`refrigeration-cop` -> `computeRefrigerationCop` in
`../../calc-refrigerant.js`); `scripts/related-tiles.mjs` (-> `refrigerant-mass-flow` / `condenser-heat-rejection` /
`seer-eer` / `compression-ratio-refrig`); `data/search/aliases.json` ("COP", "coefficient of performance", "Carnot COP",
"refrigeration efficiency", "second law efficiency", "EER from COP", "cycle efficiency", "COP calculator", "ideal COP");
the id appended to the existing refrigerant renderers block in `app.js`; the `// dims:` annotation (enthalpies specific
energy, temps temperature, COP/efficiency dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the Carnot Rankine conversion, the `EER = 3.412 COP` identity, and the `h2 <= h1` /
`T_cond <= T_evap` / non-finite error seams. No new module; re-pin `calc-refrigerant.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the Carnot and EER assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `COP` / Carnot / second-law / EER
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (RE 60 W 25 -> COP 2.40, 38% of Carnot).

## 5. Roadmap position

Middle of the refrigeration-cycle batch (v320..v322) in `calc-refrigerant.js`, adding the cycle efficiency beside the mass
flow. The condenser heat of rejection (v322) follows. An isentropic-versus-actual compression efficiency, a bundled P-h
property lookup, and a full cycle-diagram summary chaining mass flow, COP, and heat rejection are the deliberate next
follow-ons once the trio lands.
