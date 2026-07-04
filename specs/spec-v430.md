# roughlogic.com Specification v430 -- Rebar Weight Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.149.0; proposed 2026-07-03). Second tile of the concrete-construction trio (v429 formwork pressure -> v430 rebar
> weight takeoff -> v431 ready-mix order). The catalog develops, splices, and designs reinforcement (`rc-development-length`,
> `rebar-lap-splice`, `rc-beam-flexure`) but never weighs it -- the tonnage a rebar order and a placement crew are priced
> and paid on.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Reinforcing steel is bought and billed by weight, and
> each bar size has a fixed unit weight: `#3 = 0.376`, `#4 = 0.668`, `#5 = 1.043`, `#6 = 1.502`, `#7 = 2.044`,
> `#8 = 2.670`, `#9 = 3.400`, `#10 = 4.303`, `#11 = 5.313 lb/ft`. The total weight is `lb/ft * total length`, and the tonnage
> and cost follow. No tile does the rebar takeoff. This adds the weight tile to the existing **`calc-construction.js`**
> module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v429.md.
>
> **The gap, and the evidence for it.** `500 linear feet` of `#5` bar weighs `1.043 * 500 = 522 lb`, about `0.26 ton`; at
> a rebar price the cost follows directly. Switch to `#8` and the same `500 ft` jumps to `2.670 * 500 = 1,335 lb`, `0.67
> ton` -- more than double the steel for a two-size increase. No tile does this; an estimator pricing reinforcement had to
> look up the unit weights and multiply by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bar size is a designation
(mapped to a unit weight); the total length is a length (ft); the unit weight is a mass per length (lb/ft); the total weight
is a mass (lb, also reported in tons); the price is a rate (USD/lb). The v18/v21 contract: any non-finite input, or a
non-positive length, or an unrecognized bar size, returns `{ error }`; the tile looks up the ASTM unit weight for the bar
size, computes the total weight, tons, and cost when a price is given. Citation discipline (v19/v22): `GOVERNANCE.general`
over the rebar unit-weight takeoff by name; `editionNote` names **the ASTM A615 nominal bar weights (`#3 = 0.376` through
`#11 = 5.313 lb/ft`, and `#14 = 7.65`, `#18 = 13.60`), the total weight `= unit_weight * total_length`, and the `2000 lb per
ton` conversion**, and states that **this returns the reinforcing steel weight and cost for a given bar size and length, that
total length must include laps and hooks (see `rebar-lap-splice`), and that it is a takeoff aid, not a substitute for a
detailed bar list or the mill order**.

## 2. The tile

### 2.1 `rebar-weight-takeoff` -- Rebar Weight Takeoff

```
inputs:
  bar_size       -       bar designation (3-11, 14, 18)
  total_len_ft   ft      total linear feet of this bar size
  price_per_lb   USD/lb  rebar price (optional)

unit_wt = { 3:0.376, 4:0.668, 5:1.043, 6:1.502, 7:2.044, 8:2.670, 9:3.400, 10:4.303, 11:5.313, 14:7.65, 18:13.60 }[bar_size]
weight_lb = unit_wt * total_len_ft
tons      = weight_lb / 2000
cost      = weight_lb * price_per_lb
```

**Pinned worked example (#5 bar, 500 ft).** `unit weight = 1.043 lb/ft`; `weight = 1.043*500 = 522 lb = 0.26 ton`.
**Cross-check (a bigger bar).** `#8` at the same `500 ft` weighs `2.670*500 = 1,335 lb = 0.67 ton` -- more than double for a
`#5`-to-`#8` jump. An unrecognized bar size or a non-positive length takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "carpentry"]`, beside `rebar-lap-splice`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, ASTM A615 rebar weights, `editionNote` naming the unit-weight table, the
`weight = unit_wt*length` relation, and the tons conversion); `test/fixtures/worked-examples.json` (the #5 example + the #8
cross-check); `test/fixtures/compute-map.js` (`rebar-weight-takeoff` -> `computeRebarWeightTakeoff` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `rebar-lap-splice` / `rc-development-length` /
`concrete-formwork-pressure` / `ready-mix-concrete-order`); `data/search/aliases.json` ("rebar weight", "rebar takeoff",
"reinforcing steel weight", "bar weight per foot", "rebar tonnage", "rebar pounds", "reinforcement takeoff", "steel bar
weight", "rebar order weight"); the id appended to the existing construction renderers block in `app.js`; the `// dims:`
annotation (bar size / length input, unit weight mass/length, weight mass); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the unit-weight lookup, and the bad-size / non-positive / non-finite
error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the lookup, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the weight / tons / cost output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (#5, 500 ft -> 522 lb, 0.26 ton).

## 5. Roadmap position

The middle of the concrete-construction trio: `concrete-formwork-pressure` (v429) sizes the forms and
`ready-mix-concrete-order` (v431) orders the concrete, while this weighs the steel. A full bar-list takeoff summing multiple
sizes and a bar-bending cut-length companion are the deliberate next follow-ons.
