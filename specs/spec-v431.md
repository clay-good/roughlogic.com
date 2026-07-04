# roughlogic.com Specification v431 -- Ready-Mix Concrete Order (Trucks, Waste, Short Load) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.149.0; proposed 2026-07-03). Third and final tile of the concrete-construction trio (v429 formwork pressure ->
> v430 rebar weight takeoff -> v431 ready-mix order). The catalog computes concrete volume, but ordering it is a different
> job: how many truckloads, how much waste to add so you do not come up short, and whether the last load trips a
> short-load fee.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A concrete pour is ordered in truckloads (about
> `10 yd^3` each) with a waste/over-order allowance so a slab does not run short on the last few feet; the volume with waste
> is `yd^3 * (1 + waste)`, the truck count is that divided by the load size and rounded up, and the last (partial) load is
> what remains. A load below the plant minimum (commonly `10 yd^3`) carries a short-load fee. The `concrete` tile gives the
> volume only, not the order. This adds the ordering tile to the existing **`calc-construction.js`** module (Group E); no
> new group, trade, or dependency. Inherits spec.md through spec-v430.md.
>
> **The gap, and the evidence for it.** A `42 yd^3` pour with an `8%` waste allowance is `42 * 1.08 = 45.4 yd^3`, which is
> `ceil(45.4 / 10) = 5` truckloads with a `5.4 yd^3` last load. Because the whole order exceeds one truck the short-load fee
> does not apply, but a small `6 yd^3` pour would ship as a single sub-`10 yd^3` load and trip the fee. No tile does this; a
> contractor placing an order had the volume but not the truck count, the waste, or the fee flag.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The volume and load sizes are
volumes (yd^3); the waste allowance is dimensionless (percent); the truck count and the short-load flag are dimensionless;
the price is a rate (USD/yd^3). The v18/v21 contract: any non-finite input, or a non-positive volume or load size, or a
negative waste, returns `{ error }`; the truck count is rounded up, the last-load size is the remainder, and a total order
below the plant minimum raises the short-load flag. Citation discipline (v19/v22): `GOVERNANCE.general` over the ready-mix
ordering convention by name; `editionNote` names **the ASTM C94 ready-mixed concrete ordering practice, the ordered volume
`= volume * (1 + waste)`, a typical `~10 yd^3` truck capacity and plant minimum, and the short-load fee on sub-minimum
loads**, and states that **this returns the truckload count, waste-adjusted volume, and short-load flag for a concrete
order, that waste allowance and truck/minimum sizes vary by plant, and that it is an ordering aid, not a substitute for the
supplier's quote**.

## 2. The tile

### 2.1 `ready-mix-concrete-order` -- Ready-Mix Concrete Order (Trucks, Waste, Short Load)

```
inputs:
  volume_yd3     yd^3     required (in-place) concrete volume
  waste_pct      %        waste/over-order allowance (default 5-10)
  load_yd3       yd^3     truck capacity (default 10)
  min_yd3        yd^3     plant minimum before short-load fee (default 10)
  price_per_yd3  USD/yd3  concrete price (optional)

ordered_yd3 = volume_yd3 * (1 + waste_pct/100)
trucks      = ceil(ordered_yd3 / load_yd3)
last_load   = ordered_yd3 - (trucks - 1) * load_yd3
short_load  = ordered_yd3 < min_yd3
```

**Pinned worked example (42 yd^3, 8% waste, 10 yd^3 truck).** `ordered = 42*1.08 = 45.4 yd^3`;
`trucks = ceil(45.4/10) = 5`; `last load = 5.4 yd^3`; no short-load fee (order exceeds the minimum). **Cross-check (a small
pour trips the fee).** A `6 yd^3` pour at `8%` waste is `6.48 yd^3`, one sub-`10 yd^3` load -> short-load fee flagged. A
non-positive volume or load size takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "carpentry"]`, beside `concrete` / `rebar-weight-takeoff`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASTM C94 ready-mix ordering, `editionNote`
naming the waste, truck-count, last-load, and short-load relations); `test/fixtures/worked-examples.json` (the 5-truck
example + the short-load cross-check); `test/fixtures/compute-map.js` (`ready-mix-concrete-order` ->
`computeReadyMixConcreteOrder` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `concrete` /
`rebar-weight-takeoff` / `concrete-formwork-pressure` / `concrete-mix-design`); `data/search/aliases.json` ("ready mix
order", "concrete truck loads", "concrete order", "concrete waste allowance", "short load fee", "yards of concrete",
"concrete delivery", "ready mix trucks", "concrete ordering"); the id appended to the existing construction renderers block
in `app.js`; the `// dims:` annotation (volumes volume, waste dimensionless, trucks count); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the truck rounding, the short-load flag, and the
non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the short-load flag, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the trucks / last-load / fee set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (42 yd^3, 8% -> 45.4 yd^3, 5 trucks).

## 5. Roadmap position

Closes the concrete-construction trio: v429 sizes the forms, v430 weighs the steel, and v431 orders the concrete. A
volume-from-slab-dimensions front-end and a pump-vs-chute placement-cost comparison are the deliberate next follow-ons.
