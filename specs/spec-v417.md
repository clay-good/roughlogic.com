# roughlogic.com Specification v417 -- Mulch, Topsoil, and Aggregate Volume (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a landscape/agriculture trio (v417 mulch/topsoil volume -> v418 grain
> drying energy -> v419 manure nutrient application). One of the most common jobsite questions has no tile: how many cubic
> yards, bags, tons, and truckloads of mulch, topsoil, or aggregate does it take to cover an area to a depth.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Spreading a bulk material is pure volume:
> `yd^3 = area_ft2 * (depth_in / 12) / 27`, and from there the bag count (`* 27 / bag_ft3`), the tonnage
> (`yd^3 * bulk_density_ton_per_yd3`), and the delivery-truck count (`/ load_yd3`). The catalog has no landscape bulk-material
> takeoff. This adds the volume tile to the existing **`calc-agriculture.js`** module (Group L); no new group, trade, or
> dependency. Inherits spec.md through spec-v416.md.
>
> **The gap, and the evidence for it.** Covering `1000 ft^2` with `3 in` of material is
> `yd^3 = 1000 * (3/12) / 27 = 9.26 yd^3`; that is `9.26 * 27 / 2 = 125` two-cubic-foot bags, about `9.26 * 1.1 = 10.2 tons`
> of topsoil (at `1.1 ton/yd^3`), and one `10 yd^3` truckload. Switch the material to mulch (`~0.5 ton/yd^3`) and the tonnage
> halves though the volume is identical. No tile does this; a contractor ordering material had to convert area, depth, and
> density in his head.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The area is an area (ft^2);
the depth is a length (in); the bulk density is a mass per volume (ton/yd^3); the bag size and load size are volumes (ft^3
and yd^3); the volume is a volume (yd^3), the tonnage a mass (ton), and the bag and load counts are dimensionless. The
v18/v21 contract: any non-finite input, or a non-positive area, depth, density, bag size, or load size, returns `{ error }`;
the bag and truckload counts are rounded up to whole units, and an optional waste/compaction allowance inflates the volume.
Citation discipline (v19/v22): `GOVERNANCE.general` over the bulk-material volume conversion by name; `editionNote` names
**the volume `yd^3 = area_ft2 * (depth_in/12) / 27`, the bag count `yd^3 * 27 / bag_ft3`, the tonnage `yd^3 * bulk_density`,
typical bulk densities (mulch `~0.5`, topsoil `~1.1`, sand/gravel `~1.4 ton/yd^3`), and the `27 ft^3 per yd^3` conversion**,
and states that **this returns the ordering quantities for a bulk material spread to a depth, that bulk density varies with
moisture and compaction, and that it is a takeoff aid, not a substitute for the supplier's delivered quantities**.

## 2. The tile

### 2.1 `mulch-topsoil-volume` -- Mulch, Topsoil, and Aggregate Volume

```
inputs:
  area_ft2         ft^2       area to cover
  depth_in         in         spread depth
  bulk_density     ton/yd^3   material density (mulch ~0.5, topsoil ~1.1, gravel ~1.4)
  bag_ft3          ft^3       bag size (default 2)
  load_yd3         yd^3       truck load size (default 10)
  waste_pct        %          waste/compaction allowance (default 0)

yd3   = area_ft2 * (depth_in/12) / 27 * (1 + waste_pct/100)
bags  = ceil(yd3 * 27 / bag_ft3)
tons  = yd3 * bulk_density
loads = ceil(yd3 / load_yd3)
```

**Pinned worked example (1000 ft^2, 3 in, topsoil 1.1 ton/yd^3).** `yd^3 = 1000*(3/12)/27 = 9.26`;
`bags = ceil(9.26*27/2) = 125`; `tons = 9.26*1.1 = 10.2`; `loads = ceil(9.26/10) = 1`. **Cross-check (mulch is lighter).**
The same `9.26 yd^3` of mulch at `0.5 ton/yd^3` is `4.6 tons` -- half the weight, same volume and truckloads. A non-positive
input takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside the other landscape/soil tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the bulk-material volume conversion, `editionNote` naming the
volume, bag, and tonnage relations and the typical densities); `test/fixtures/worked-examples.json` (the topsoil example +
the mulch cross-check); `test/fixtures/compute-map.js` (`mulch-topsoil-volume` -> `computeMulchTopsoilVolume` in
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `soil-swell-shrink` / `earthwork-end-area` /
`grain-drying-energy` / `concrete`); `data/search/aliases.json` ("mulch volume", "topsoil volume", "cubic yards mulch",
"landscape material calculator", "mulch bags", "topsoil tons", "gravel volume", "material coverage", "yards of dirt"); the
id appended to the existing agriculture renderers block in `app.js`; the `// dims:` annotation (area area, depth length,
density mass/volume, volume volume, tons mass); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the bag/load rounding, and the non-positive / non-finite error seams. No new module; re-pin
`calc-agriculture.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the rounding, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the yd3 / bags / tons / loads set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1000 ft^2, 3 in -> 9.26 yd^3, 125 bags).

## 5. Roadmap position

Opens the landscape/agriculture trio: `grain-drying-energy` (v418) and `manure-nutrient-application` (v419) round out the
farm side. A seed/fertilizer-by-area spreader-rate tile and a paver/sand-base takeoff are the deliberate next follow-ons.
