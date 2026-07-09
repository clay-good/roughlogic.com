# roughlogic.com Specification v570 -- Population Equivalent (Organic Load) (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, water and wastewater operations); no new module, group, or dependency. Inherits spec.md through spec-v569.md.
>
> **The gap, and the evidence for it.** `bod-tss-loading-removal` computes the pounds of load a plant handles, but not
> the **population equivalent** -- the number of residents an industrial or tributary discharge is worth, which a
> pretreatment coordinator uses to set surcharges and a designer uses to size for a new connection. The catch is which
> parameter governs. Population equivalent is figured three ways -- from BOD (0.17 lb per capita per day), from flow (100
> gallons per capita per day), and from suspended solids (0.20 lb per capita per day) -- and the correct answer is the
> **largest** of the three, not BOD alone. A high-strength, low-flow discharge (a cannery, a brewery) can equal
> thousands of residents in oxygen demand while its gallons say otherwise, so charging on flow alone under-bills the
> loader. The tile takes the flow and the BOD (and optionally the suspended solids), and returns the three population
> equivalents and the governing one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flow is a volumetric
flow (`L^3 T^-1`, in MGD); the BOD and suspended-solids concentrations are mass concentrations (`M L^-3`, in mg/L); the
loads are `M T^-1` (lb/day); the population equivalents are `dimensionless` (counts of people); the per-capita bases and
the `8.34` constant are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive flow or BOD, or a
non-positive per-capita basis returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the PE
relations by name (standard sanitary engineering); `editionNote` names the **population equivalent (organic load)**,
prints `bod_load = MGD x BOD x 8.34`, `PE_bod = bod_load / 0.17`, `PE_flow = gpd / 100`, and `PE_ss = ss_load / 0.20`,
with the governing `PE = max(PE_bod, PE_flow, PE_ss)`, and states that **the population equivalent is set by the
governing parameter (BOD, flow, or suspended solids), whichever is largest, not by BOD alone -- a high-strength,
low-flow industrial discharge can equal thousands of residents in oxygen demand while its gallons say otherwise, the
per-capita bases (0.17 lb BOD, 100 gpd, 0.20 lb SS) are editable conventions, and the pretreatment ordinance and the
authority govern** -- an estimating aid, not a permit determination.

## 2. The tile

### 2.1 `population-equivalent` -- Why the Largest of BOD, Flow, and SS Governs

```
inputs:
  flow_mgd       MGD    discharge flow
  bod_mg_l       mg/L   BOD concentration
  ss_mg_l        mg/L   suspended solids concentration (0 to skip)

bod_load = flow_mgd x bod_mg_l x 8.34             [lb/day]
PE_bod   = bod_load / 0.17                          [people]
PE_flow  = flow_mgd x 1e6 / 100                     [people]
PE_ss    = ss_mg_l > 0 ? (flow_mgd x ss_mg_l x 8.34) / 0.20 : null   [people]
PE       = max(PE_bod, PE_flow, PE_ss)              [people]
```

**Pinned worked example (a 0.5 MGD cannery discharge at 600 mg/L BOD, 400 mg/L SS).** The BOD load is
`0.5 x 600 x 8.34 = 2,502 lb/day`, so `PE_bod = 2,502 / 0.17 = ` **14,718 people**. The flow equivalent is only
`0.5e6 / 100 = 5,000 people` and the SS equivalent `(0.5 x 400 x 8.34) / 0.20 = 8,340 people`. The governing figure is
the largest, **14,718 people** -- the plant sees this half-MGD discharge as a town of nearly 15,000 in oxygen demand,
though its gallons look like 5,000. Billing on flow would under-charge it threefold. **Cross-check (a dilute, high-flow
discharge flips the governing parameter).** A 2 MGD discharge at only 100 mg/L BOD gives `PE_bod = (2 x 100 x 8.34) /
0.17 = 9,812` but `PE_flow = 2e6 / 100 = ` **20,000 people** -- now flow governs, because the load is spread thin. The
tile returns the three equivalents and the governing one.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the high-strength example + the
high-flow cross-check); `test/fixtures/compute-map.js` (`population-equivalent` -> `computePopulationEquivalent` in
`../../calc-water.js`); `scripts/related-tiles.mjs` (-> `bod-tss-loading-removal` / `digester-vs-loading` /
`aeration-oxygen-demand`); `data/search/aliases.json` ("population equivalent", "pe wastewater", "organic load
equivalent", "0.17 lb bod capita", "industrial load equivalent", "pretreatment surcharge", "capita equivalent",
"loading equivalent"); the id appended to the water renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the three PE relations, the
governing maximum, and the error seams (non-finite, non-positive flow / BOD / basis). Hand-writes its renderer
(mirroring the calc-water.js `bod-tss-loading-removal` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the PE_bod / PE_flow / PE_ss / governing stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the cannery example -> 14,718 people).

## 5. Roadmap position

Adds the capita equivalence beside `bod-tss-loading-removal` (the raw load) and feeds sizing and surcharge decisions. A
surcharge-dollar companion (rate per PE over a baseline) and a combined-domestic-plus-industrial PE roll-up are
deliberate future follow-ons. Further Group M growth stays evidence-driven.
