# roughlogic.com Specification v418 -- Grain Drying Energy and Fuel (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.146.0; proposed 2026-07-03). As-landed correction: the cross-check prose (20% to 17.5% removes 1,615 lb, 26 gal) is a slip; the spec-s own formula 56000*(20-17.5)/(100-17.5) gives 1,697 lb and ~27.8 gal, which is what landed. Second tile of the landscape/agriculture trio (v417 mulch/topsoil volume -> v418 grain
> drying energy -> v419 manure nutrient application). `grain-shrink-moisture` gives the weight and bushels lost to drying;
> this tile gives the other half a farmer needs -- the energy and propane it takes to remove that moisture.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Drying grain costs fuel. The water to remove is
> `water_lb = weight * (Mi - Mf) / (100 - Mf)`, the energy is roughly `1500 Btu per lb` of water (including dryer
> inefficiency), and the propane is `energy / 91,500 Btu/gal`. `grain-shrink-moisture` handles the weight shrink but never
> the drying energy or fuel. This adds the drying-energy tile to the existing **`calc-agriculture.js`** module (Group L); no
> new group, trade, or dependency. Inherits spec.md through spec-v417.md.
>
> **The gap, and the evidence for it.** Drying `1000 bushels` of corn (`56 lb/bu`, so `56,000 lb`) from `20%` to `15%`
> moisture removes `water = 56000 * (20 - 15) / (100 - 15) = 3,294 lb` of water. At `1500 Btu/lb` that is `4.94 million Btu`,
> or `4,940,000 / 91,500 = 54 gallons` of propane -- a real line on the fall fuel bill. Halve the moisture removal (`20%` to
> `17.5%`) and the fuel roughly halves. No tile does this; the catalog told the farmer how much weight he lost but not what
> the drying cost.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bushels are dimensionless
(count) and the pounds-per-bushel a mass; the moistures are dimensionless (percent); the water removed is a mass (lb); the
energy is an energy (Btu); the propane is a volume (gal). The v18/v21 contract: any non-finite input, or a non-positive
weight, or a final moisture at or above the initial (no drying), or a final moisture at/above 100, returns `{ error }`; the
energy factor defaults to `1500 Btu/lb` water and the propane heat content to `91,500 Btu/gal`, and the tile reports water
removed, energy, propane, and fuel cost when a price is given. Citation discipline (v19/v22): `GOVERNANCE.general` over
grain drying energy by name; `editionNote` names **the water-removal mass balance
`water = weight * (Mi - Mf)/(100 - Mf)` (wet basis), the practical drying energy of about `1500 Btu per lb` of water
(latent heat plus dryer inefficiency), and propane at `91,500 Btu/gal`**, and states that **this returns the drying energy
and fuel for a moisture reduction, that the `1500 Btu/lb` figure is a high-temperature-dryer average (efficient dryers use
less), and that it is a planning aid, not a substitute for the dryer manufacturer's fuel data**.

## 2. The tile

### 2.1 `grain-drying-energy` -- Grain Drying Energy and Fuel

```
inputs:
  bushels        bu    quantity of grain
  lb_per_bushel  lb    test weight (corn ~56, wheat ~60, soybeans ~60)
  mi_percent     %     initial moisture
  mf_percent     %     final (target) moisture
  btu_per_lb     Btu   drying energy per lb water (default 1500)
  price_per_gal  USD   propane price (optional)

weight   = bushels * lb_per_bushel
water_lb = weight * (mi_percent - mf_percent) / (100 - mf_percent)
energy   = water_lb * btu_per_lb
propane  = energy / 91500
```

**Pinned worked example (1000 bu corn, 56 lb/bu, 20% to 15%).** `weight = 56,000 lb`;
`water = 56000*(20-15)/(100-15) = 3,294 lb`; `energy = 3294*1500 = 4.94 million Btu`; `propane = 4940000/91500 = 54 gal`.
**Cross-check (less drying).** `20%` to `17.5%` removes `1,615 lb` of water and `26 gal` of propane -- roughly half the
water, half the fuel. A final moisture at or above the initial, or a non-positive weight, takes the error path; the
non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `grain-shrink-moisture`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, grain drying energy, `editionNote` naming the water-removal balance,
the `1500 Btu/lb` factor, and the propane heat content); `test/fixtures/worked-examples.json` (the full-drying example + the
half-drying cross-check); `test/fixtures/compute-map.js` (`grain-drying-energy` -> `computeGrainDryingEnergy` in
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `grain-shrink-moisture` / `mulch-topsoil-volume` /
`livestock-dry-matter-intake` / `manure-nutrient-application`); `data/search/aliases.json` ("grain drying energy", "grain
drying fuel", "propane grain drying", "moisture removal energy", "corn drying cost", "dryer fuel", "btu grain drying",
"grain dryer propane", "drying cost per bushel"); the id appended to the existing agriculture renderers block in `app.js`;
the `// dims:` annotation (bushels/moistures dimensionless, weight/water mass, energy energy, propane volume); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the moisture-order check, and the
non-positive / non-finite error seams. No new module; re-pin `calc-agriculture.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the moisture-order check, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the water / energy / propane set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1000 bu, 20->15% -> 3294 lb, 54 gal).

## 5. Roadmap position

The middle of the landscape/agriculture trio: `mulch-topsoil-volume` (v417) covers the ground side and
`manure-nutrient-application` (v419) the nutrient side. A drying-cost-per-bushel and a natural-air vs high-temp dryer
comparison are the deliberate next follow-ons.
