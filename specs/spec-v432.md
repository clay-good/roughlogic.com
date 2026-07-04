# roughlogic.com Specification v432 -- Walk-In Cooler Heat Load (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.150.0; proposed 2026-07-03). First tile of a walk-in refrigeration trio (v432 box heat load -> v433 product pull-down
> -> v434 evaporator TD). The catalog has the refrigeration cycle (`refrigeration-cop`, `refrigerant-mass-flow`,
> `condenser-heat-rejection`) but never the box heat load that sizes the system -- the sum of transmission, infiltration,
> product, and internal gains a walk-in cooler must remove.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Sizing a walk-in starts with its heat load: the
> transmission through the panels `U * A * dT`, plus the infiltration through the door, the product being cooled, and the
> internal gains (lights, motors, people), all bumped by a safety factor and converted to tons. The catalog computes the
> cycle that carries the load away but never the load itself. This adds the box-load tile to the existing
> **`calc-refrigerant.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v431.md.
>
> **The gap, and the evidence for it.** A walk-in with `800 ft^2` of `4 in` panel (`U = 0.05`) at a `60 deg F` difference
> (`95 deg F` ambient to `35 deg F` box) has a transmission load of `0.05 * 800 * 60 = 2,400 Btu/hr`; add `3,000` infiltration,
> `5,000` product, and `1,500` internal for `11,900 Btu/hr`, and a `10%` safety factor brings it to `13,090 Btu/hr`, about
> `1.09 tons`. That total is what the condensing unit must match. No tile does this; the cycle tiles assumed the load was
> already known.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The panel U-factor is a
conductance (Btu/hr-ft^2-F); the area is an area (ft^2); the temperature difference is a temperature difference (deg F);
the infiltration, product, and internal loads are powers (Btu/hr); the safety factor is dimensionless; the total load is a
power (Btu/hr, also reported in tons). The v18/v21 contract: any non-finite input, or a non-positive U, area, or dT, or a
negative component load, returns `{ error }`; the tile sums the four components, applies the safety factor (default `1.10`),
and reports the total in Btu/hr and tons. Citation discipline (v19/v22): `GOVERNANCE.general` over the refrigeration box
load by name; `editionNote` names **the ASHRAE Refrigeration Handbook load-component method, the transmission `U*A*dT`, the
infiltration/product/internal component loads, a typical `10%` safety factor, and the `12,000 Btu/hr per ton` conversion**,
and states that **this returns the total walk-in heat load from its components, that infiltration and product loads come
from door-usage and product-pull-down calculations (`product-pull-down-load`), and that it is a sizing aid, not a substitute
for a full refrigeration load calculation**.

## 2. The tile

### 2.1 `walk-in-cooler-load` -- Walk-In Cooler Heat Load

```
inputs:
  u_factor        Btu/hr-ft2-F   panel U-factor (4 in ~0.05, 6 in ~0.03)
  area_ft2        ft^2           total envelope area (walls + ceiling + floor)
  delta_t_f       F              ambient-to-box temperature difference
  infiltration_btuh  Btu/hr      infiltration/door load
  product_btuh    Btu/hr         product load (from product-pull-down-load)
  internal_btuh   Btu/hr         lights, motors, people
  safety          -              safety factor (default 1.10)

transmission = u_factor * area_ft2 * delta_t_f
subtotal     = transmission + infiltration_btuh + product_btuh + internal_btuh
total_btuh   = subtotal * safety
tons         = total_btuh / 12000
```

**Pinned worked example (U 0.05, 800 ft^2, dT 60, +3000 +5000 +1500, 1.10).** transmission `2,400 Btu/hr`;
subtotal `11,900`; total `13,090 Btu/hr = 1.09 tons`. **Cross-check (a tighter box).** Switch to `6 in` panel (`U = 0.03`)
and the transmission drops to `1,440 Btu/hr`, cutting the total to `12,034 Btu/hr` -- insulation directly shrinks the
compressor. A non-positive U, area, or dT takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `refrigeration-cop` / `condenser-heat-rejection`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASHRAE refrigeration box load, `editionNote`
naming the transmission and component-sum relations, the safety factor, and the tons conversion);
`test/fixtures/worked-examples.json` (the 4 in example + the 6 in cross-check); `test/fixtures/compute-map.js`
(`walk-in-cooler-load` -> `computeWalkInCoolerLoad` in `../../calc-refrigerant.js`); `scripts/related-tiles.mjs` (->
`product-pull-down-load` / `evaporator-td-dtd` / `refrigeration-cop` / `condenser-heat-rejection`);
`data/search/aliases.json` ("walk in cooler load", "refrigeration load", "box load", "cooler heat load", "walk in
refrigeration", "cooler sizing", "refrigeration box heat gain", "freezer load", "walk in tons"); the id appended to the
existing refrigerant renderers block in `app.js`; the `// dims:` annotation (U conductance, area area, dT temperature,
loads power); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the component sum,
and the non-positive / non-finite error seams. No new module; re-pin `calc-refrigerant.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the total / tons output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (U 0.05, 800 ft^2, 60 F -> 13,090 Btu/hr, 1.09 tons).

## 5. Roadmap position

Opens the walk-in refrigeration trio: `product-pull-down-load` (v433) supplies the product component and `evaporator-td-dtd`
(v434) selects the coil. A door-infiltration (air-change) sub-model and a condensing-unit-selection tie-in are the deliberate
next follow-ons.
