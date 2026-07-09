# roughlogic.com Specification v569 -- Stored-Grain Aeration Fan Airflow (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v568.md.
>
> **The gap, and the evidence for it.** `grain-drying-energy` sizes the propane to dry grain, but nothing sizes the
> aeration fan that cools stored grain to hold it. The required airflow is simply a rate in cubic feet per minute per
> bushel times the bushels, but the catch that stalls fans is what the cfm/bu number hides: static pressure rises
> steeply with grain **depth**, and the fan **power** grows roughly fourfold when either the airflow rate or the depth
> doubles. A fan sized on cfm/bu alone stalls against the back-pressure in a tall bin, so the fan curve must be read at
> the actual static pressure. A second point the tile makes explicit: aeration (cooling, about 0.1 to 0.25 cfm/bu) is a
> different job from natural-air drying (0.5 to 1.0 cfm/bu), and mixing them up either wastes fan or fails to dry. The
> tile takes the bin capacity and the target airflow rate, and returns the required fan airflow and an approximate
> cooling time, with the static-pressure and power caveats.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bin capacity is a
count (`dimensionless`, in bushels); the airflow rate is `L^3 T^-1` per bushel (cfm/bu, carried as `dimensionless` per
bushel); the required airflow is a volumetric flow (`L^3 T^-1`, in cfm); the cooling time is a time (`T`, in hours). The
v18/v21 contract: any non-finite input, a non-positive bin capacity, or a non-positive airflow rate returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the aeration relations by name (MWPS / university
extension; Shedd airflow-resistance curves); `editionNote` names the **stored-grain aeration fan airflow**, prints
`required_cfm = rate_cfm_per_bu x bushels` and the rule-of-thumb `cooling_hours = 15 / rate_cfm_per_bu`, lists the bands
(**cooling 0.1 to 0.25 cfm/bu, natural-air drying 0.5 to 1.0 cfm/bu**), and states that **static pressure rises steeply
with grain depth and the fan power grows about fourfold when the airflow rate or the depth doubles (so a fan sized on
cfm/bu alone stalls against back-pressure in a tall bin and the fan curve must be read at the actual static pressure),
aeration cooling is not the same as natural-air drying, and the fan selection at the design static pressure and the
grain condition govern** -- a sizing aid, not a fan selection.

## 2. The tile

### 2.1 `grain-aeration-airflow` -- The cfm/bu That Hides the Static-Pressure Stall

```
inputs:
  bin_capacity_bu   bu       stored grain quantity
  airflow_rate      cfm/bu   target airflow rate (0.1-0.25 cooling, 0.5-1.0 drying)

required_cfm  = airflow_rate x bin_capacity_bu             [cfm]
cooling_hours = 15 / airflow_rate                          [hr]   (rule of thumb per cooling front)
```

**Pinned worked example (20,000 bushels at 0.15 cfm/bu for cooling).** The fan must move
`0.15 x 20,000 = ` **3,000 cfm**, and one cooling front takes about `15 / 0.15 = ` **100 hours** of fan run -- a slow,
low-power cooling pass. But that 3,000 cfm must be delivered against the bin's static pressure, which a deep bin raises
sharply. **Cross-check (drying takes five times the air and far more power).** Natural-air drying the same bin at
`0.75 cfm/bu` needs `0.75 x 20,000 = ` **15,000 cfm** -- five times the airflow, and because fan power scales roughly
with the cube of airflow against rising static pressure, the drying fan draws vastly more than five times the cooling
fan's power. Sizing a drying fan as a scaled-up cooling fan badly under-powers it. The tile returns the required airflow
and the approximate cooling time.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the cooling example + the drying
cross-check); `test/fixtures/compute-map.js` (`grain-aeration-airflow` -> `computeGrainAerationAirflow` in
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `grain-drying-energy` / `grain-bin-capacity` /
`center-pivot-runtime`); `data/search/aliases.json` ("grain aeration", "aeration fan airflow", "cfm per bushel", "grain
cooling fan", "aeration vs drying", "static pressure grain", "grain fan sizing", "stored grain airflow"); the id
appended to the agriculture renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-
index; a `bounds-fuzzer.test.js` block pinning both examples, the rate x bushels airflow, the cooling-time rule, the
cooling-vs-drying bands, and the error seams (non-finite, non-positive capacity / rate). Hand-writes its renderer
(mirroring the calc-agriculture.js `grain-drying-energy` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the airflow / cooling-time stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the cooling example -> 3,000 cfm, ~100 hr).

## 5. Roadmap position

Adds the aeration-fan airflow beside `grain-drying-energy` (the drying-fuel side) and `grain-bin-capacity`. A static-
pressure estimate from grain depth and a Shedd airflow-resistance curve, and a fan-power estimate at the design static
pressure, are deliberate future follow-ons. Further Group L growth stays evidence-driven.
