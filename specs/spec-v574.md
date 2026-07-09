# roughlogic.com Specification v574 -- Activated-Sludge Oxygen and Blower Air Demand (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, water and wastewater operations); no new module, group, or dependency. Inherits spec.md through spec-v573.md.
>
> **The gap, and the evidence for it.** `bod-tss-loading-removal` gives the BOD load, but not the oxygen the aeration
> system must supply or the blower air to deliver it, which is the largest energy cost at a plant. The oxygen demand is
> a factor (0.9 to 1.5 lb O2 per lb BOD removed, rising with sludge age) times the BOD removed. Two catches make the air
> number balloon. First, **nitrification adds 4.6 lb of oxygen per pound of ammonia-nitrogen** oxidized -- a large,
> easy-to-forget term that starves the process at high sludge age. Second, the standard oxygen transfer efficiency
> (SOTE) of diffused aeration is only about 10 to 35%, so most of the blown air leaves the tank unused, and the air
> demand in scfm is far larger than the oxygen demand in pounds suggests. The tile takes the BOD removed, the oxygen
> factor, the ammonia nitrified, and the transfer efficiency, and returns the oxygen demand and the blower air in scfm
> -- the number a blower is sized to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The BOD removed, the
ammonia nitrified, and the oxygen demand are `M T^-1` (lb/day); the air demand is `L^3 T^-1` (scfm); the oxygen factor,
the SOTE percent, and the `4.6`, `0.075`, `0.232`, and `1440` constants are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive BOD removed or oxygen factor, a negative ammonia, or a SOTE outside `(0, 100]` returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the aeration relations by name (WEF aeration
design); `editionNote` names the **activated-sludge oxygen and air demand**, prints
`O2_demand = factor x BOD_removed + 4.6 x NH3_nitrified` and
`air_scfm = O2_demand / (0.075 x 0.232 x SOTE x 1440)`, notes the factor band (**0.9 short SRT to 1.5 extended
aeration**), and states that **nitrification adds 4.6 lb O2 per lb of ammonia-nitrogen (a large term easy to forget that
starves the process at high sludge age), the standard oxygen transfer efficiency of diffused aeration is only about 10
to 35% so most blown air leaves unused and the air demand far exceeds what the oxygen pounds suggest, and the aeration
equipment and the field transfer efficiency govern** -- a sizing aid, not a blower selection.

## 2. The tile

### 2.1 `aeration-oxygen-demand` -- Why the Air Demand Dwarfs the Oxygen Demand (and Nitrification Adds 4.6x)

```
inputs:
  bod_removed_lb_day   lb/day   BOD removed by the process
  oxygen_factor        -        lb O2 per lb BOD (0.9 short SRT to 1.5 extended)
  nh3_nitrified_lb_day lb/day   ammonia-nitrogen oxidized (0 if no nitrification)
  sote_pct             %        standard oxygen transfer efficiency

O2_demand = oxygen_factor x bod_removed_lb_day + 4.6 x nh3_nitrified_lb_day     [lb/day]
air_scfm  = O2_demand / (0.075 x 0.232 x (sote_pct / 100) x 1440)               [scfm]
```

**Pinned worked example (2,000 lb/day BOD removed, factor 1.1, 200 lb/day ammonia nitrified, 20% SOTE).** The oxygen
demand is `1.1 x 2,000 + 4.6 x 200 = 2,200 + 920 = ` **3,120 lb/day** -- the nitrogen term adds nearly half again as
much oxygen as the carbon. At 20% transfer efficiency the blower air is
`3,120 / (0.075 x 0.232 x 0.20 x 1,440) = 3,120 / 5.01 = ` **623 scfm**. **Cross-check (forgetting nitrification
under-sizes the blower).** Ignore the ammonia (treat it as carbonaceous only): `O2 = 2,200 lb/day`, giving
`2,200 / 5.01 = ` **439 scfm** -- 30% less air, which would starve the nitrifiers and stall ammonia removal, the exact
failure of forgetting the 4.6 factor. The tile returns the oxygen demand and the blower air.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the with-nitrification example + the
carbonaceous-only cross-check); `test/fixtures/compute-map.js` (`aeration-oxygen-demand` -> `computeAerationOxygenDemand`
in `../../calc-water.js`); `scripts/related-tiles.mjs` (-> `bod-tss-loading-removal` / `ras-flow-rate` /
`digester-vs-loading`); `data/search/aliases.json` ("aeration oxygen demand", "blower air scfm", "oxygen requirement
activated sludge", "sote", "nitrification oxygen 4.6", "aeration air demand", "diffuser air", "o2 per bod"); the id
appended to the water renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the oxygen-demand relation with the 4.6 nitrification term, the
air-from-SOTE relation, and the error seams (non-finite, non-positive BOD / factor, negative NH3, SOTE out of range).
Hand-writes its renderer (mirroring the calc-water.js `bod-tss-loading-removal` pattern). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the O2-demand / air-scfm stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the base example -> 3,120 lb/day, 623 scfm).

## 5. Roadmap position

Adds the aeration oxygen and air demand beside `bod-tss-loading-removal` (the load it treats) and the process tiles
`ras-flow-rate` and `was-srt-control`. A blower-horsepower estimate (from the air and the discharge pressure) and an
alpha/beta field-correction on the SOTE are deliberate future follow-ons. Further Group M growth stays evidence-driven.
