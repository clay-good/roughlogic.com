# roughlogic.com Specification v180 -- Commercial General-Lighting and Receptacle Load (NEC 220.12 / 220.14 / 220.44) (calc-service.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter: one tile computing the commercial
> general-lighting load by occupancy unit load (NEC Table 220.12) and the receptacle-outlet load at
> 180 VA per strap (220.14(I)) with the 220.44 demand factor. Adds one tile to **`calc-service.js`**
> (Group A); no new module, group, or dependency. Inherits spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** The catalog's load tiles (`service-load`,
> `service-load-optional`, `service-load-standard`) are dwelling methods (Part III as applied to homes).
> Nothing computes the *commercial* general-lighting load from the Table 220.12 VA/ft^2 unit value by
> occupancy, or the 220.14(I) receptacle load with the 220.44 demand factor (first 10 kVA at 100%, the
> remainder at 50%). An electrician sizing a store, office, or warehouse service has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
floor area is `L^2` (ft^2), the unit load is VA per ft^2 (`VA x L^-2`), the loads and demand are
power (VA, carried dimensionless in VA), and amps are `I` via `power / voltage`. The bundled Table
220.12 unit loads (office 1300 VA general use plus the occupancy value, store, warehouse, dwelling 3
VA/ft^2, etc.), the 180 VA receptacle figure, and the 220.44 demand breakpoint (10 kVA) are annotated
as the public NEC values. The v18/v21 contract: any non-finite input, a non-positive area, or a
negative receptacle count returns `{ error }`; the only division is by the guarded supply voltage.
Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 Table 220.12, 220.14(I), and
220.44 (general lighting, receptacle outlets, and demand)`, `editionNote` `NEC_DISCLOSURE`, with the
note that the 2017+ NEC permits the energy-code unit lighting load in place of Table 220.12 where the
energy code is followed, that general-lighting is a continuous load (125% at the OCPD), and that the
AHJ governs the occupancy classification.

## 2. The tile

### 2.1 `commercial-lighting-load` -- Commercial General-Lighting + Receptacle Demand

```
inputs:
  floor_area_ft2        L^2      gross floor area served
  unit_load_va_ft2      VA/L^2   Table 220.12 unit load for the occupancy (e.g. 3 VA/ft^2 store)
  receptacle_count      count    number of general-use receptacle straps (180 VA each, 220.14(I))
  supply_v              voltage  service voltage for the amps line

lighting_va    = floor_area_ft2 x unit_load_va_ft2
recep_va       = receptacle_count x 180
recep_demand   = recep_va <= 10000 ? recep_va : 10000 + 0.50 x (recep_va - 10000)   # 220.44
total_va       = lighting_va + recep_demand
total_a        = total_va / supply_v
```

**Pinned worked example.** A 5,000 ft^2 store at the Table 220.12 store value of **3 VA/ft^2** with
60 receptacle straps: `lighting = 5,000 x 3 = 15,000 VA`; `recep = 60 x 180 = 10,800 VA`; the 220.44
demand is `10,000 + 0.50 x (10,800 - 10,000) = 10,400 VA`; `total = 15,000 + 10,400 = 25,400 VA`;
`total_a = 25,400 / 208 = 122 A` (before adding the 125% continuous factor at the OCPD for the
lighting portion). **Cross-check (under the breakpoint).** The same store with only 40 straps:
`recep = 7,200 VA`, all at 100% (under 10 kVA) -> `total = 15,000 + 7,200 = 22,200 VA`. The energy
code may set the lighting unit load; the AHJ governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 Table 220.12 / 220.14(I) / 220.44, the unit
load, the 180 VA strap, and the 10 kVA demand breakpoint listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`commercial-lighting-load` -> `computeCommercialLightingLoad` in `../../calc-service.js`);
`scripts/related-tiles.mjs` (-> `service-load-standard` / `lighting-density` / `range-demand-220-55`);
`data/search/aliases.json` ("commercial load", "220.12", "general lighting load", "receptacle load",
"180 va", "220.44 demand"); the id appended to the existing `SERVICE_RENDERERS` declare in `app.js`;
the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning the over-10kVA example, the under-breakpoint cross-check, and error seams (non-finite, area <=
0, count < 0). Raise the `calc-service.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the demand breakpoint paths); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
lighting VA, receptacle demand, and total lines wrap on a phone); render-no-nan + a11y sweep, output
read to the value (5,000 ft^2 / 60 straps -> 25,400 VA / 122 A; 40 straps -> 22,200 VA).

## 5. Roadmap position

Extends the load family (`service-load-standard`, dwelling demand trio v167-v169) into commercial
occupancies. Further Group A growth stays evidence-driven.
