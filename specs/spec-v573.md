# roughlogic.com Specification v573 -- Anaerobic Digester Volatile Solids Loading (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water and wastewater operations); no new module, group, or dependency. Inherits spec.md through spec-v572.md.
>
> **The gap, and the evidence for it.** The bench covers secondary-treatment loading but not the anaerobic digester's
> health metric: the volatile-solids loading rate (VSLR), the pounds of volatile solids fed per day per 1,000 cubic feet
> of digester. The catch is that the loading rate, **not the tank being full**, is what tells an operator whether the
> digester is healthy. Overload it past roughly 400 lb VS/day per 1,000 ft^3 and the acid-forming bacteria outrun the
> methane-formers -- the pH and alkalinity crash and the digester "sours," a slow failure that takes weeks to recover. A
> thin feed (low percent solids) can still hit the limit at high flow, and a rich feed can overload at low flow, so the
> concentration and the flow both matter. The tile takes the sludge feed flow, its percent total and volatile solids,
> and the digester volume, and returns the volatile solids fed, the VSLR against the limit, and the hydraulic detention
> time -- the numbers that keep a digester from souring.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The feed flow is a
volumetric flow (`L^3 T^-1`, in gpd); the percent total and volatile solids are `dimensionless`; the digester volume is
a volume (`L^3`, in ft^3); the volatile solids fed is `M T^-1` (lb/day); the VSLR is `M T^-1 L^-3` (lb/day per 1,000
ft^3); the detention time is a time (`T`, in days); the `8.34` and `7.48` constants are `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive feed flow, digester volume, percent total solids, or percent volatile
solids, or a percent above 100 returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the loading
relations by name (WEF; university operator courses); `editionNote` names the **anaerobic digester volatile-solids
loading rate**, prints `VS_fed = feed_gal x 8.34 x (%TS/100) x (%VS/100)`, `VSLR = VS_fed / volume x 1000`, and the
detention time `DT = volume x 7.48 / feed_gal`, notes the high-rate band (**100 to 400 lb VS/day per 1,000 ft^3**), and
states that **overloading past about 400 lb VS/day per 1,000 ft^3 sours the digester as the acid-formers outrun the
methane-formers and pH and alkalinity crash, the loading rate not a full tank is the health metric, a thin feed can hit
the limit at high flow and a rich feed at low flow, and the digester monitoring (pH, alkalinity, gas) and the operator
govern** -- an operating aid, not a process design.

## 2. The tile

### 2.1 `digester-vs-loading` -- The Loading Rate That Sours a Digester (Not a Full Tank)

```
inputs:
  feed_flow_gpd   gpd    sludge feed flow
  percent_ts      %      total solids of the feed
  percent_vs      %      volatile fraction of the total solids
  digester_ft3    ft3    digester volume

VS_fed  = feed_flow_gpd x 8.34 x (percent_ts / 100) x (percent_vs / 100)     [lb/day]
VSLR    = VS_fed / digester_ft3 x 1000                                       [lb/day per 1000 ft^3]
DT_days = digester_ft3 x 7.48 / feed_flow_gpd                               [days]
```

**Pinned worked example (15,000 gpd of 4% TS sludge at 75% VS into a 20,000 ft^3 digester).** The volatile solids fed
are `15,000 x 8.34 x 0.04 x 0.75 = ` **3,753 lb/day**, so the loading rate is
`3,753 / 20,000 x 1,000 = ` **188 lb VS/day per 1,000 ft^3** -- comfortably inside the 100 to 400 healthy band -- and
the detention time is `20,000 x 7.48 / 15,000 = ` **10.0 days**. **Cross-check (a richer feed overloads at the same
flow).** Thicken the feed to `8% TS`: the volatile solids double to `7,506 lb/day` and the VSLR jumps to
`7,506 / 20,000 x 1,000 = ` **375 lb VS/day per 1,000 ft^3** -- near the 400 ceiling at the identical flow, the reason
a rich feed can sour a digester that a thin feed would not. The tile returns the volatile solids fed, the VSLR, and the
detention time.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the base example + the rich-feed
cross-check); `test/fixtures/compute-map.js` (`digester-vs-loading` -> `computeDigesterVsLoading` in
`../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `bod-tss-loading-removal` / `population-equivalent` /
`srt-fm-ratio`); `data/search/aliases.json` ("volatile solids loading", "vslr", "digester loading", "anaerobic
digester", "digester souring", "lb vs per 1000 cf", "digester detention time", "biosolids loading"); the id appended to
the treatment renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the VS-fed relation, the VSLR against the band, the detention time,
and the error seams (non-finite, non-positive flow / volume / percents, percent > 100). Hand-writes its renderer
(mirroring the calc-treatment.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the VS-fed / VSLR / DT stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the base example -> 188 lb VS/day per 1,000 ft^3).

## 5. Roadmap position

Adds the digester health metric beside `bod-tss-loading-removal` (secondary loading) and `population-equivalent`. A
methane-production estimate (from the volatile solids destroyed) and an alkalinity-to-volatile-acid ratio companion are
deliberate future follow-ons. Further Group M growth stays evidence-driven.
