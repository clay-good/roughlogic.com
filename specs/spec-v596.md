# roughlogic.com Specification v596 -- Digester Gas and Methane Production (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, the water/wastewater treatment bench); no new module, group, or dependency. Inherits spec.md through
> spec-v595.md.
>
> **The gap, and the evidence for it.** Spec-v573 (`digester-vs-loading`) names this tile as a deliberate follow-on:
> "a methane-production estimate (from the volatile solids destroyed)." The loading tile answers whether the digester
> is being fed at a healthy rate; it never answers the payoff question -- **how much gas, and how much usable energy,
> comes out.** Anaerobic digestion is the one wastewater process that produces a fuel, and the digester gas that a
> plant flares or burns in an engine is the whole economic case for the digester. The estimate is a standard operator
> relation: the volatile solids destroyed is the VS fed times the reduction fraction; each pound of VS destroyed
> yields on the order of **12 to 18 cubic feet of digester gas** (default 15); the gas is roughly **65% methane** with
> the balance carbon dioxide; and the recoverable energy is the methane volume times its heating value (about **960
> BTU per cubic foot** of methane). A digester destroying 5,500 lb of VS a day makes about **82,500 ft^3 of gas**,
> **54,000 ft^3 of methane**, and **51 MMBtu/day** -- enough to run the plant's boilers or a cogeneration engine. The
> tile turns the loading number into the gas-and-energy number the plant actually budgets around.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The VS fed and VS
destroyed are `M T^-1` (lb/day); the reduction, methane, and the gas yield / heating-value empirical constants are
`dimensionless` (percents and per-lb / per-ft^3 factors, carried dimensionless like the other treatment-bench
empirical constants); the gas and methane volumes are `L^3 T^-1` (ft^3/day) and the energy `M L^2 T^-3` (BTU/day),
both carried as dimensionless to the parse-only lint alongside the sibling loading tile. The v18/v21 contract: any
non-finite input, a non-positive VS fed or gas yield, a reduction outside 0 to 100, or a methane percent outside 0 to
100 returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the digester-gas production relation
by name (WEF / university operator-course practice, matching the `digester-vs-loading` sibling); `editionNote` prints
`VS_destroyed = VS_fed x reduction/100`, `gas_ft3 = VS_destroyed x yield`, `methane_ft3 = gas_ft3 x methane_pct/100`,
`energy_btu = methane_ft3 x 960`, pins the default constants (**yield 15 ft^3/lb in a 12-18 band, methane 65%, 960
BTU/ft^3 methane**), and states that **the yield and methane fraction are feed- and temperature-dependent (a
digester-gas analysis governs the real values), the energy is the methane heating value only (the CO2 carries none),
the estimate assumes steady mesophilic operation, and the digester monitoring and the operator of record govern** --
a planning estimate, not a metered gas measurement.

## 2. The tile

### 2.1 `digester-gas-production` -- Gas, Methane, and Energy From Volatile Solids Destroyed

```
inputs:
  vs_fed_lb_day       lb/day   volatile solids fed (from digester-vs-loading)
  vs_reduction_pct    %        volatile-solids destruction (typical 50-60%)
  gas_yield_ft3_lb    ft3/lb   digester gas per lb VS destroyed (default 15, band 12-18)
  methane_pct         %        methane fraction of the gas (default 65)

vs_destroyed_lb_day = vs_fed_lb_day x vs_reduction_pct / 100      [lb/day]
gas_ft3_day         = vs_destroyed_lb_day x gas_yield_ft3_lb      [ft3/day]
methane_ft3_day     = gas_ft3_day x methane_pct / 100            [ft3/day]
energy_btu_day      = methane_ft3_day x 960                      [BTU/day]  (960 BTU/ft3 methane)
```

**Pinned worked example (10,000 lb/day VS fed at 55% reduction, default 15 ft^3/lb and 65% methane).**
`VS_destroyed = 10,000 x 0.55 = ` **5,500 lb/day**. `gas = 5,500 x 15 = ` **82,500 ft^3/day** of digester gas,
`methane = 82,500 x 0.65 = ` **53,625 ft^3/day**, and `energy = 53,625 x 960 = 51,480,000 BTU = ` **51.5 MMBtu/day**
-- enough recoverable energy to carry the plant's digester heating and building load with a surplus for a
cogeneration engine. **Cross-check (a smaller plant, richer gas).** 6,000 lb/day VS fed at 60% reduction, 16 ft^3/lb,
62% methane: `VS_destroyed = 3,600 lb/day`, `gas = 57,600 ft^3/day`, `methane = 35,712 ft^3/day`,
`energy = 34,283,520 BTU = ` **34.3 MMBtu/day** -- confirming the energy scales with the VS destroyed, the yield, and
the methane fraction together.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`, placed inside the Group M comment block near
`digester-vs-loading` -- the `citations.test.js` **Group M audit count bumps**); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`digester-gas-production` -> `computeDigesterGasProduction` in
`../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `digester-vs-loading` / `population-equivalent` /
`bod-tss-loading-removal`); `data/search/aliases.json` ("digester gas", "biogas production", "methane production",
"digester gas energy", "volatile solids destroyed", plus question rows); the id appended to the calc-treatment
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index;
a `bounds-fuzzer.test.js` block pinning both examples, the linear scalings, and the error seams (non-finite,
non-positive VS fed / yield, reduction or methane out of 0-100). Renderer uses the module's `_rPool` factory
(mirroring `digester-vs-loading`), with the yield and methane fields carrying their defaults. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group M audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 10,000 lb/day
example -> 82,500 ft^3/day gas / 51.5 MMBtu/day).

## 5. Roadmap position

Completes the digester pair spec-v573 opened: `digester-vs-loading` sets the healthy feed rate, this tile turns the
destroyed solids into gas and recoverable energy. The v573-named alkalinity-to-volatile-acid ratio companion remains a
deliberate future follow-on. Further Group M growth stays evidence-driven.
