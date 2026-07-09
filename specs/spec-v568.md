# roughlogic.com Specification v568 -- Center-Pivot Application Depth and Runtime (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v567.md.
>
> **The gap, and the evidence for it.** The bench has turf-zone irrigation runtime (`irrigation-zone-runtime`,
> `sprinkler-precip-rate`) and crop ET depth (`irrigation-requirement`), but not field-scale center-pivot capacity. A
> grower needs to know how many hours a pivot must run to apply a target depth over the circle, and the arithmetic
> `hours = area x depth x 452.6 / Q` gives it. The catch that a naive area-times-depth hides is that a pivot applies the
> water by moving its **outer tower** (set by the percent timer), and the outer spans sweep far more area than the inner
> ones -- so a uniform depth needs more flow per foot outward, and the instantaneous application **rate** under an outer
> span can exceed the soil's intake rate and run off, even when the daily depth is correct. The tile takes the system
> flow, the irrigated area, the target depth, and the application efficiency, and returns the runtime per pass, the gross
> capacity per acre, and the net depth applied -- the numbers a pivot schedule is built from.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The system flow is a
volumetric flow (`L^3 T^-1`, in gpm); the irrigated area is an area (`L^2`, in acres); the depth is a length (`L`, in
inches); the runtime is a time (`T`, in hours); the gross capacity per acre is `L^3 T^-1 L^-2` (gpm/ac); the efficiency
percent and the `452.6` constant are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive flow,
area, or depth, or an efficiency outside `(0, 100]` returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the pivot relations by name (USDA-NRCS center-pivot design; university extension);
`editionNote` names the **center-pivot application depth and runtime**, prints
`hours = area x depth x 452.6 / flow`, `gross_gpm_per_acre = flow / area`, and `net_depth = depth x efficiency / 100`,
and states that **the depth is set by the outer-tower speed (percent timer) and the outer spans cover far more area than
the inner ones so a uniform depth needs increasing flow per foot outward, the instantaneous application rate under an
outer span can exceed the soil intake rate and run off even when the daily depth is right, the 452.6 factor converts
acre-inches to gallons over minutes, and the actual pivot design and soil intake govern** -- a scheduling aid, not a
pivot design.

## 2. The tile

### 2.1 `center-pivot-runtime` -- Hours per Pass, and Why the Outer Span Can Still Run Off

```
inputs:
  system_flow_gpm   gpm   pivot system flow Q
  area_acres        ac    irrigated area A
  target_depth_in   in    gross target application depth d
  efficiency_pct    %     application efficiency

hours             = area_acres x target_depth_in x 452.6 / system_flow_gpm     [hr]
gross_gpm_per_acre = system_flow_gpm / area_acres                             [gpm/ac]
net_depth_in      = target_depth_in x efficiency_pct / 100                    [in]
```

**Pinned worked example (an 800 gpm pivot on 125 acres applying 1 inch gross at 85% efficiency).** The runtime per pass
is `125 x 1 x 452.6 / 800 = ` **70.7 hours** -- about three days for a one-inch pass -- and the gross capacity is
`800 / 125 = ` **6.4 gpm per acre**. The net depth reaching the crop is `1 x 0.85 = ` **0.85 in**. **Cross-check (a
deeper pass scales the runtime).** Applying `0.5 in` on the same system takes `125 x 0.5 x 452.6 / 800 = ` **35.4
hours** -- half the time for half the depth, but the outer-span application rate is unchanged, so a soil that runs off
at 1 inch still runs off in the same intense outer band at 0.5 inch; the depth sets the hours, not the runoff risk. The
tile returns the runtime, the gross capacity per acre, and the net depth.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["irrigation", "agriculture"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 1 in
example + the 0.5 in cross-check); `test/fixtures/compute-map.js` (`center-pivot-runtime` -> `computeCenterPivotRuntime`
in `../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `irrigation-requirement` / `sprinkler-precip-rate` /
`irrigation-zone-runtime`); `data/search/aliases.json` ("center pivot", "pivot runtime", "application depth pivot",
"gpm per acre", "pivot capacity", "irrigation depth field", "percent timer pivot", "pivot hours per inch"); the id
appended to the agriculture renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-
index; a `bounds-fuzzer.test.js` block pinning both examples, the 452.6 runtime relation, the gross capacity, the net
depth, and the error seams (non-finite, non-positive flow / area / depth, efficiency out of range). Hand-writes its
renderer (mirroring the calc-agriculture.js `irrigation-requirement` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the runtime / capacity / net-depth stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 1 in example -> 70.7 hr, 6.4 gpm/ac).

## 5. Roadmap position

Adds field-scale pivot capacity beside the turf `sprinkler-precip-rate` and the crop-ET `irrigation-requirement`. An
application-rate-vs-soil-intake check (the outer-span instantaneous rate against a soil intake family) and a
percent-timer-to-depth converter are deliberate future follow-ons. Further Group L growth stays evidence-driven.
