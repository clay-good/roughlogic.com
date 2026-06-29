# roughlogic.com Specification v208 -- Irrigation Zone Runtime and Cycle-and-Soak (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v207..v211 (landscape irrigation and planting -- the install-side
> cluster the catalog never had: precipitation rate, zone runtime, drip flow, plant spacing, sod takeoff).**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-agriculture.js`** (Group L); no new module, group, or dependency. Inherits spec.md through
> spec-v207.md.
>
> **The gap, and the evidence for it.** `sprinkler-precip-rate` (v207) gives the in/hr a zone applies, but
> the number a tech actually programs into the controller is the *runtime in minutes* -- and that is not just
> depth over rate. The gross runtime divides the net runtime by the lower-quarter distribution uniformity
> (the dry corners need the extra), and on tight soil the gross time has to be split into cycles short enough
> that water soaks in instead of running off the slope. The catalog can now state the precipitation rate but
> not turn it into the controller program, which is the whole point of knowing the rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target
depth is a length (`L`, in); the precipitation rate is a velocity (`L/T`, in/hr); the distribution
uniformity is `dimensionless` in (0, 1]; the net and gross runtimes are a time (`T`, min); the maximum
cycle length is a time (`T`, min) and the cycle count is `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive depth / precip rate / max-cycle length, or a DU outside (0, 1] returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the runtime and cycle-and-soak
relations by name; `editionNote` names the **Irrigation Association** scheduling references and states that
**the DU comes from a catch-can audit (`irrigation-uniformity`), the soil intake rate that caps the cycle
length comes from the soil type (user-supplied here), and this is a scheduling estimate that a controller
and the site's actual runoff govern** -- a program aid, not a guaranteed schedule.

## 2. The tile

### 2.1 `irrigation-zone-runtime` -- Runtime to Apply a Target Depth, With Cycle-and-Soak

```
inputs:
  target_in     L         depth to apply this cycle-day, in (from ET budget or rule of thumb)
  precip_in_hr  L/T       zone precipitation rate, in/hr (from sprinkler-precip-rate)
  du            dimensionless   lower-quarter distribution uniformity, (0,1]  (default 1.0)
  max_cycle_min T         longest single run before runoff on this soil/slope, min

net_min   = target_in / precip_in_hr x 60
gross_min = net_min / du                       # add water for the dry quarter
cycles    = ceil(gross_min / max_cycle_min)    # cycle-and-soak to beat runoff
per_cycle_min = gross_min / cycles
```

**Pinned worked example (lawn zone).** Apply 0.75 in at a 1.20 in/hr rate, DU 0.75, max cycle 10 min on
clay: `net = 0.75 / 1.20 x 60 = 37.5 min`; `gross = 37.5 / 0.75 = ` **50.0 min**; `cycles = ceil(50/10) =
5`, so program **5 cycles of 10 min** with soak gaps between them.
**Cross-check (sandy soil, one run).** Same 0.75 in and DU but a 3.85 in/hr spray zone on sand with a 30 min
max cycle: `net = 0.75 / 3.85 x 60 = 11.7 min`; `gross = 11.7 / 0.75 = 15.6 min`; `cycles = ceil(15.6/30) =
1` -- one **15.6 min** run, no soak split. The high rate plus forgiving soil collapses the program to a
single short cycle.

## 3. Wiring

A `tools-data.js` row (group `L`, trade `["landscaping","agriculture"]`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`GOVERNANCE.general`, the runtime and cycle-and-soak relations, `editionNote`
naming the Irrigation Association scheduling references and the DU / soil-intake / runoff caveats);
`test/fixtures/worked-examples.json` (clay example + sandy cross-check); `test/fixtures/compute-map.js`
(`irrigation-zone-runtime` -> `computeIrrigationZoneRuntime` in `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (-> `sprinkler-precip-rate` / `irrigation-requirement` / `irrigation-uniformity`);
`data/search/aliases.json` ("zone runtime", "sprinkler runtime", "watering time", "cycle and soak",
"controller program", "soak time"); the id appended to the existing agriculture renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples and error seams (non-finite, depth/precip/max-cycle <= 0, DU outside (0,1]). Raise the
`calc-agriculture.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the cycle-split path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the net/gross/cycle
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (0.75 in / 1.20 in/hr / DU
0.75 -> 50 min, 5 cycles).

## 5. Roadmap position

The runtime half of the install cluster, fed directly by `sprinkler-precip-rate` (v207) and the ET budget of
`irrigation-requirement`. Pairs with `drip-zone-flow` (v209) for the drip side. A seasonal-adjust (percent)
table is a deliberate future follow-on.
