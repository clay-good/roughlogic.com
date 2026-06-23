# roughlogic.com Specification v167 -- Household Electric Range Demand Load (NEC Table 220.55, Column C) (calc-service.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile computing the demand load for household
> electric ranges and cooking appliances using NEC Table 220.55 Column C, including the >12 kW
> adjustment. Adds one tile to **`calc-service.js`** (Group A); no new module, group, or dependency.
> Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog runs the whole dwelling service load
> (`service-load`, `service-load-optional`, `service-load-standard`) but never exposes the single most
> error-prone line item inside it: the Table 220.55 Column C range demand, where one 12 kW range is
> demanded at 8 kW, not 12, and a range over 12 kW gets a 5%-per-kW Column C increase. Electricians
> size range circuits and feeders off this table constantly and there is no standalone tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Range
nameplate ratings and the demand result are power (kW, carried dimensionless in kW); the range count
is a count; the demand amps are `I` via `power / voltage`. The bundled Column C demand values for 1
through ~12+ ranges are annotated as the public NEC Table 220.55 Column C series. The v18/v21
contract: any non-finite input, a non-positive nameplate kW, or a range count below 1 returns
`{ error }`; the only division is by the guarded 240 V supply for the amps line. Citation discipline
(v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 Table 220.55 and its Notes (ranges, wall ovens,
cooktops)`, `editionNote` `NEC_DISCLOSURE`, with the note that Notes 1-4 (the >12 kW increase, the
under-3.5 kW vs 3.5-8.75 kW Columns A/B path, and unequal-rating averaging) govern the edge cases and
this tile implements the common equal-rating Column C path with the Note 1 increase.

## 2. The tile

### 2.1 `range-demand-220-55` -- Range / Cooking Demand Load (Column C)

```
inputs:
  num_ranges       count    number of household ranges (equal rating)
  nameplate_kw     power    nameplate rating of each range (kW)
  supply_v         voltage  service voltage for the amps line (default 240)

col_c_kw   = Table 220.55 Column C demand for num_ranges   # e.g. 1->8, 2->11, 3->14, 4->17, 5->20 kW
# Note 1: for ranges 8.75-12 kW use Column C as-is; over 12 kW add 5% to Column C per kW (or major
# fraction) above 12, using the average nameplate where unequal.
increase   = nameplate_kw > 12 ? ceil(nameplate_kw - 12) x 0.05 : 0
demand_kw  = col_c_kw x (1 + increase)
demand_a   = demand_kw x 1000 / supply_v
```

**Pinned worked example.** One 12 kW range: Column C for 1 range is **8 kW**, no >12 kW increase ->
`demand_kw = 8`; `demand_a = 8,000 / 240 = 33.3 A`. The 40 A range circuit is sized on 8 kW, not 12.
**Cross-check (>12 kW, Note 1).** One 16 kW range: 16 - 12 = 4 kW over, so `increase = 4 x 5% = 20%`;
`demand_kw = 8 x 1.20 = 9.6 kW`; `demand_a = 9,600 / 240 = 40.0 A`. Multiple-range counts read Column
C directly (e.g. four 12 kW ranges -> 17 kW). The Table 220.55 Notes and the AHJ govern the Column
A/B and unequal-rating cases.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 Table 220.55 and Notes, the Column C series and
the Note 1 increase listed, `editionNote` `NEC_DISCLOSURE`); `test/fixtures/worked-examples.json`
(example + cross-check); `test/fixtures/compute-map.js` (`range-demand-220-55` ->
`computeRangeDemand22055` in `../../calc-service.js`); `scripts/related-tiles.mjs`
(-> `service-load` / `dryer-demand-220-54` / `neutral-demand-220-61`); `data/search/aliases.json`
("range demand", "220.55", "column c", "cooktop load", "electric range load", "oven demand"); the id
appended to the existing `SERVICE_RENDERERS` declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the 12 kW example, the
>12 kW increase, a multi-range count, and error seams (non-finite, kw <= 0, count < 1). Raise the
`calc-service.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the >12 kW path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Column C
value, the increase, and amps wrap on a phone); render-no-nan + a11y sweep, output read to the value
(1x12 kW -> 8 kW / 33.3 A; 1x16 kW -> 9.6 kW / 40 A).

## 5. Roadmap position

Begins the dwelling demand-factor trio (range here, dryer in v168, neutral in v169) that decomposes
the service-load calc into its high-error line items. Further Group A growth stays evidence-driven.
