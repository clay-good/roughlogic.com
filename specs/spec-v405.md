# roughlogic.com Specification v405 -- Clarifier Surface, Weir, and Solids Loading (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a water/wastewater-operations trio (v405 clarifier loading -> v406 BOD/TSS
> mass loading and removal -> v407 TDS from conductivity). The catalog has activated-sludge process control (`srt-fm-ratio`,
> `svi-sludge-index`) and filter loading, but never the three loading rates that tell an operator whether a settling basin
> is overloaded.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A clarifier is checked by three loading rates: the
> surface overflow rate `SOR = Q / A` (gpd per ft^2 of surface), the weir loading rate `Q / weir length` (gpd per ft), and
> the solids loading rate `Q_MGD * MLSS * 8.34 / A` (lb per ft^2 per day). Ten-States Standards cap each; exceed the surface
> overflow rate and floc washes out with the effluent. `filter-loading` is a filter rate and `srt-fm-ratio` is a biological
> ratio; nothing does clarifier hydraulic and solids loading. This adds the clarifier tile to the existing
> **`calc-treatment.js`** module (Group M); no new group, trade, or dependency. Inherits spec.md through spec-v404.md.
>
> **The gap, and the evidence for it.** A `1.0 MGD` flow into a `40 ft`-diameter circular clarifier (`A = 1257 ft^2`,
> peripheral weir `125.7 ft`) runs a surface overflow rate of `1,000,000 / 1257 = 796 gpd/ft^2` and a weir loading of
> `1,000,000 / 125.7 = 7,958 gpd/ft`; at `2,500 mg/L` MLSS the solids loading is `1.0 * 2500 * 8.34 / 1257 = 16.6
> lb/ft^2/day`. All three sit near their Ten-States limits, exactly what an operator needs to see before adding flow. No
> tile does this; the plant had process-control tiles but no basin loading check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flow is a volumetric flow
(MGD, converted to gpd internally); the surface area is an area (ft^2); the weir length is a length (ft); the MLSS is a
concentration (mg/L). The surface overflow rate is gpd/ft^2, the weir loading gpd/ft, and the solids loading lb/ft^2/day.
The v18/v21 contract: any non-finite input, or a non-positive flow, area, or weir length, returns `{ error }`; the solids
loading is computed only when an MLSS is given (a primary clarifier omits it), and the tile reports each rate against its
typical Ten-States band. Citation discipline (v19/v22): `GOVERNANCE.general` over clarifier loading by name; `editionNote`
names **Ten-States Standards (GLUMRB) / AWWA sedimentation, the surface overflow rate `SOR = Q / A` (gpd/ft^2), the weir
loading `Q / weir_length` (gpd/ft), the solids loading `Q_MGD * MLSS * 8.34 / A` (lb/ft^2/day), and the `8.34` lb-per-gallon
factor**, and states that **this returns the three clarifier loading rates for a settling basin, that typical limits are
about `700-1000 gpd/ft^2` surface and `10,000-20,000 gpd/ft` weir, and that it is an operations aid, not a substitute for
the design engineer or the state review standard**.

## 2. The tile

### 2.1 `clarifier-surface-loading` -- Clarifier Surface, Weir, and Solids Loading

```
inputs:
  flow_mgd      MGD    average or peak flow
  surface_ft2   ft^2   clarifier surface area
  weir_len_ft   ft     total weir length
  mlss_mgl      mg/L   mixed-liquor suspended solids (optional, secondary)

sor_gpd_ft2 = (flow_mgd * 1e6) / surface_ft2
weir_gpd_ft = (flow_mgd * 1e6) / weir_len_ft
solids_lb_ft2_day = flow_mgd * mlss_mgl * 8.34 / surface_ft2
```

**Pinned worked example (1.0 MGD, 40 ft dia -> A 1257 ft^2, weir 125.7 ft, MLSS 2500).** `SOR = 796 gpd/ft^2`;
`weir = 7,958 gpd/ft`; `solids = 16.6 lb/ft^2/day`. **Cross-check (double the flow overloads it).** At `2.0 MGD` the surface
overflow rate jumps to `1,592 gpd/ft^2` -- well past the `~1000` limit, so floc carries over. A non-positive flow, area, or
weir length takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `srt-fm-ratio` / `filter-loading`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, Ten-States sedimentation, `editionNote` naming the SOR, weir, and
solids loading relations, the 8.34 factor, and the typical limits); `test/fixtures/worked-examples.json` (the loaded example
+ the overload cross-check); `test/fixtures/compute-map.js` (`clarifier-surface-loading` ->
`computeClarifierSurfaceLoading` in `../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `filter-loading` /
`srt-fm-ratio` / `weir-flow` / `bod-tss-loading-removal`); `data/search/aliases.json` ("clarifier loading", "surface
overflow rate", "weir loading rate", "solids loading rate", "clarifier sizing", "sedimentation loading", "SOR gpd ft2",
"settling basin loading", "secondary clarifier"); the id appended to the existing treatment renderers block in `app.js`; the
`// dims:` annotation (flow volumetric flow, area area, weir length, MLSS concentration); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the three loading rates, and the non-positive /
non-finite error seams. No new module; re-pin `calc-treatment.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the three loading rates wrap on a phone); render-no-nan + a11y
sweep, output read to the value (1.0 MGD, 1257 ft^2 -> 796 gpd/ft^2, 7958 gpd/ft).

## 5. Roadmap position

Opens the water/wastewater-operations trio: `bod-tss-loading-removal` (v406) tracks the mass load the plant treats and
`tds-from-conductivity` (v407) reads a field water-quality parameter. An aeration-basin oxygen-transfer (AOTR/SOTR) tile is
the deliberate next follow-on.
