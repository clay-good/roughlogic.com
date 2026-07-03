# roughlogic.com Specification v320 -- Refrigerant Mass Flow from Capacity and Refrigeration Effect (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v320..v322 (the refrigeration-cycle trio -- the P-h-diagram
> quantities the catalog uses but never computes: the refrigerant mass flow from the load and the refrigeration effect
> (this spec), the coefficient of performance (v321), and the condenser heat of rejection (v322).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `refrigerant-velocity` takes the mass flow as a given
> input, but the mass flow itself comes from the load divided by the refrigeration effect off the pressure-enthalpy diagram
> -- the number that sizes the metering device, the line, and the compressor, and which the catalog never derives. Adds one
> tile to the existing **`calc-refrigerant.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md
> through spec-v319.md.
>
> **The gap, and the evidence for it.** The refrigerant mass flow is the cooling load divided by the refrigeration effect
> (the evaporator enthalpy rise), `m_dot = Q / (h1 - h4)`, where `Q` is the evaporator capacity, `h1` the suction enthalpy
> leaving the evaporator, and `h4` the enthalpy entering it (equal to the saturated-liquid enthalpy at the condenser, after
> the throttle). For a 5-ton system with a `60 Btu/lb` refrigeration effect, `Q = 5 x 200 = 1,000 Btu/min` and
> `m_dot = 1,000/60 = 16.7 lb/min` -- the mass flow a tech hands to `refrigerant-velocity` to check oil return, and the flow
> the compressor must pump. A lower refrigeration effect (a warmer liquid line, less subcooling) demands more mass flow for
> the same tons. `refrigerant-velocity` consumes the mass flow; this tile produces it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The capacity `Q` is a power
(entered in tons or Btu/h, converted to Btu/min); the enthalpies `h1`, `h4` and the refrigeration effect `RE = h1 - h4` are
specific energies (Btu/lb); the mass flow `m_dot` is a mass per time (reported in lb/min and lb/h). The v18/v21 contract:
any non-finite input, a capacity at or below zero, or a refrigeration effect at or below zero (`h1 <= h4`) returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the mass-flow-from-capacity relation by name;
`editionNote` names **the refrigerant mass flow `m_dot = Q / (h1 - h4)`, the refrigeration effect `RE = h1 - h4` from the
pressure-enthalpy diagram, the `1 ton = 200 Btu/min = 12,000 Btu/h` conversion, and that `h4 = hf` at the condensing
pressure (isenthalpic throttling)**, and states that **this returns the circulated refrigerant mass flow -- it takes the
enthalpies off the refrigerant's P-h diagram or tables at the operating condition (provide them for the refrigerant and
state points at hand), assumes steady flow and 100% evaporator effectiveness, and does not compute the compressor
displacement, the volumetric efficiency, or the enthalpies themselves; and this is an engineering aid** -- the refrigerant
property data at the operating condition govern.

## 2. The tile

### 2.1 `refrigerant-mass-flow` -- Refrigerant Mass Flow from Capacity and Refrigeration Effect

```
inputs:
  Q         tons or Btu/h    evaporator (cooling) capacity
  h1_btulb  Btu/lb           enthalpy leaving the evaporator (suction)
  h4_btulb  Btu/lb           enthalpy entering the evaporator (= hf at condenser)

Q_btumin = (unit == tons) ? Q*200 : Q/60
RE = h1_btulb - h4_btulb                        ; refrigeration effect, Btu/lb
m_dot_lbmin = Q_btumin / RE                     ; mass flow, lb/min
m_dot_lbh   = m_dot_lbmin * 60
```

**Pinned worked example (a 5-ton system, 60 Btu/lb refrigeration effect).** `Q = 5 tons = 1,000 Btu/min`, `h1 = 180`,
`h4 = 120` (`RE = 60 Btu/lb`): `m_dot = 1,000/60 = 16.7 lb/min = 1,000 lb/h`. **Cross-check (less subcooling drops the
refrigeration effect).** Warm the liquid line so `h4 = 130` (`RE = 50 Btu/lb`): `m_dot = 1,000/50 = 20.0 lb/min` -- a 17%
smaller refrigeration effect demands 20% more mass flow for the same 5 tons, the penalty of a poorly subcooled liquid line
and the reason subcooling matters to capacity. The non-finite, `Q <= 0`, and `h1 <= h4` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","refrigeration"]`, matching `refrigerant-velocity`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the mass-flow relation, `editionNote` naming
`m_dot = Q/(h1 - h4)`, `RE`, the ton conversion, the isenthalpic `h4 = hf`, and the enter-enthalpies, steady-flow caveats);
`test/fixtures/worked-examples.json` (the 5-ton example + the reduced-subcooling cross-check);
`test/fixtures/compute-map.js` (`refrigerant-mass-flow` -> `computeRefrigerantMassFlow` in `../../calc-refrigerant.js`);
`scripts/related-tiles.mjs` (-> `refrigerant-velocity` / `refrigeration-cop` / `condenser-heat-rejection` /
`superheat-subcool`); `data/search/aliases.json` ("refrigerant mass flow", "mass flow rate refrigerant", "refrigeration
effect", "lb/min refrigerant", "P-h diagram mass flow", "circulation rate", "m dot refrigerant", "capacity over
enthalpy", "evaporator mass flow"); the id appended to the existing refrigerant renderers block in `app.js`; the `// dims:`
annotation (`Q` power, enthalpies specific energy, `m_dot` mass/time); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the tons-to-Btu/min path, the inverse-RE scaling, and the `Q <= 0` /
`h1 <= h4` / non-finite error seams. No new module; re-pin `calc-refrigerant.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the RE-scaling assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `RE` / `m_dot` lb/min and lb/h stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (5 tons, RE 60 -> 16.7 lb/min).

## 5. Roadmap position

Opens the refrigeration-cycle batch (v320..v322) in `calc-refrigerant.js`, producing the mass flow the velocity tile
consumes. The coefficient of performance (v321) and the condenser heat of rejection (v322) follow. A bundled P-h property
lookup by refrigerant and state point, the compressor volumetric-efficiency and displacement chain, and a full cycle-state
summary are the deliberate next follow-ons once the trio lands.
