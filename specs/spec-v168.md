# roughlogic.com Specification v168 -- Household Clothes Dryer Demand Load (NEC 220.54) (calc-service.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.79.0; part of catalog 628 -> 639). Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile computing the household clothes dryer
> demand load under NEC 220.54 -- the 5,000 W (or nameplate, whichever is larger) per-dryer floor and
> the Table 220.54 demand factors for five or more dryers. Adds one tile to **`calc-service.js`**
> (Group A); no new module, group, or dependency. Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** Paired with the range demand (v167), the dryer line in a
> dwelling or multifamily service is its own 220.54 rule: each dryer counts at the larger of nameplate
> or 5,000 W, then a demand factor applies once there are five or more. The catalog's whole-service
> tiles bury this; an electrician sizing a laundry feeder or a multifamily house panel needs it
> standalone, and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
dryer nameplate and the demand result are power (W/kW, carried in W); the dryer count is a count; the
demand amps are `I` via `power / voltage`. The bundled Table 220.54 demand-factor series (1-4 dryers
at 100%, 5 at 85%, then declining) and the 5,000 W floor are annotated as the public NEC values. The
v18/v21 contract: any non-finite input, a non-positive nameplate, or a count below 1 returns
`{ error }`; the only division is by the guarded 240 V supply for the amps line. Citation discipline
(v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 220.54 and Table 220.54 (electric clothes
dryers, dwelling)`, `editionNote` `NEC_DISCLOSURE`, with the note that the per-dryer load is the
larger of 5,000 W or the nameplate, and that the demand factor for counts past the table is the
table's published continuation; the AHJ governs.

## 2. The tile

### 2.1 `dryer-demand-220-54` -- Clothes Dryer Feeder/Service Demand Load

```
inputs:
  num_dryers       count    number of household electric dryers
  nameplate_w      power    nameplate rating of each dryer (W); default treated against the 5000 floor
  supply_v         voltage  service voltage for the amps line (default 240)

per_dryer_w   = max(nameplate_w, 5000)              # 220.54: 5000 W or nameplate, whichever larger
connected_w   = per_dryer_w x num_dryers
demand_factor = Table 220.54 for num_dryers          # 1-4 -> 100%, 5 -> 85%, 6 -> 75%, ... declining
demand_w      = connected_w x demand_factor
demand_a      = demand_w / supply_v
```

**Pinned worked example.** Four dryers, each 4,500 W nameplate: each counts at the **5,000 W floor**
(4,500 < 5,000); `connected = 5,000 x 4 = 20,000 W`; for 1-4 dryers the demand factor is **100%**, so
`demand_w = 20,000 W`; `demand_a = 20,000 / 240 = 83.3 A`. **Cross-check (>=5, demand factor).** Five
5,000 W dryers: `connected = 25,000 W`; the Table 220.54 factor for five dryers is **85%**;
`demand_w = 25,000 x 0.85 = 21,250 W`; `demand_a = 21,250 / 240 = 88.5 A` -- five dryers demand only
slightly more than four because the factor kicks in. The AHJ governs counts beyond the table.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 220.54 and Table 220.54, the 5,000 W floor and
the demand-factor series listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`dryer-demand-220-54` -> `computeDryerDemand22054` in `../../calc-service.js`);
`scripts/related-tiles.mjs` (-> `range-demand-220-55` / `service-load` / `neutral-demand-220-61`);
`data/search/aliases.json` ("dryer demand", "220.54", "clothes dryer load", "laundry feeder", "5000
watt dryer", "dryer demand factor"); the id appended to the existing `SERVICE_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the four-dryer example, the five-dryer demand factor, the 5,000 W floor, and error seams
(non-finite, nameplate <= 0, count < 1). Raise the `calc-service.js` size cap by ~20 percent if needed
(dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the floor and demand-factor paths); `npm run
build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px
audit (the per-dryer floor, the factor, and amps wrap on a phone); render-no-nan + a11y sweep, output
read to the value (4x4.5 kW -> 20 kW / 83.3 A; 5x5 kW -> 21.25 kW / 88.5 A).

## 5. Roadmap position

Second of the dwelling demand-factor trio (range v167, dryer here, neutral v169). Further Group A
growth stays evidence-driven.
