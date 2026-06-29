# roughlogic.com Specification v209 -- Drip Zone Flow and Valve Capacity Check (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v207..v211 (landscape irrigation and planting -- the install-side
> cluster the catalog never had: precipitation rate, zone runtime, drip flow, plant spacing, sod takeoff).**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-agriculture.js`** (Group L); no new module, group, or dependency. Inherits spec.md through
> spec-v208.md.
>
> **The gap, and the evidence for it.** Spray and rotor zones get a precipitation rate (v207); drip zones do
> not -- drip is sized by *flow*, not in/hr. A drip valve has to carry the sum of every emitter on it, and
> that total (in gph, converted to gpm) has to stay under the valve's and the lateral tubing's flow limit or
> the far emitters starve. The catalog can size a chemical drip line's product (`nozzle-flow-pressure`) but
> has nothing that totals a landscape drip zone's emitter flow and checks it against the valve -- the single
> most common reason a drip zone underperforms.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The per-emitter
flow is a volumetric flow (`L^3/T`, gph); the tubing length is a length (`L`, ft) and the emitter spacing is
a length (`L`, in); the emitter count is `dimensionless`; the zone flow is `L^3/T` reported in both gph and
gpm; the valve/lateral limit is `L^3/T` (gpm) and the utilization is `dimensionless` percent. Two input
modes: point-source (emitter count given directly) or inline (count derived from tubing length and emitter
spacing). The v18/v21 contract: any non-finite input, or a non-positive emitter flow, count, length,
spacing, or valve limit, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
total-flow and utilization relations by name; `editionNote` names the **Irrigation Association** low-volume
references and the major-manufacturer drip design data, and states that **the per-emitter flow is the
manufacturer's rated gph at the design pressure, the valve and lateral-tubing limits come from the product's
published maximum flow (user-supplied here), and this is a flow-budget check, not a hydraulic pressure-loss
model** -- a capacity check, not a full lateral-line analysis.

## 2. The tile

### 2.1 `drip-zone-flow` -- Total Emitter Flow vs Valve Capacity

```
inputs (inline mode):
  tubing_ft      L       length of dripline on the zone, ft
  spacing_in     L       emitter spacing along the line, in
  emitter_gph    L^3/T   rated flow per emitter, gph
  valve_gpm      L^3/T   valve / lateral maximum flow, gpm

emitters    = floor(tubing_ft x 12 / spacing_in)
zone_gph    = emitters x emitter_gph
zone_gpm    = zone_gph / 60
utilization = zone_gpm / valve_gpm x 100        # keep under 100 percent
```

**Pinned worked example (inline dripline).** 300 ft of 0.9 gph dripline at 18 in emitter spacing on a
12 gpm valve: `emitters = floor(300 x 12 / 18) = floor(200) = 200`; `zone_gph = 200 x 0.9 = 180 gph`;
`zone_gpm = 180 / 60 = ` **3.0 gpm**; `utilization = 3.0 / 12 x 100 = ` **25 percent** -- comfortable
headroom.
**Cross-check (point-source emitters).** 120 individual 1.0 gph emitters on the same 12 gpm valve:
`zone_gph = 120 x 1.0 = 120 gph`; `zone_gpm = 2.0 gpm`; `utilization = 2.0 / 12 x 100 = ` **16.7 percent**.
Same valve, fewer total gph -- the count, not the layout, is what fills the valve.

## 3. Wiring

A `tools-data.js` row (group `L`, trade `["landscaping","agriculture"]`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`GOVERNANCE.general`, the total-flow and utilization relations, `editionNote`
naming the Irrigation Association / manufacturer drip references and the flow-budget-not-hydraulic caveat);
`test/fixtures/worked-examples.json` (inline example + point-source cross-check);
`test/fixtures/compute-map.js` (`drip-zone-flow` -> `computeDripZoneFlow` in `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (-> `sprinkler-precip-rate` / `irrigation-zone-runtime` / `nozzle-flow-pressure`);
`data/search/aliases.json` ("drip flow", "drip zone", "emitter flow", "gph to gpm", "valve capacity",
"dripline"); the id appended to the existing agriculture renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and
error seams (non-finite, any input <= 0). Raise the `calc-agriculture.js` size cap by ~20 percent if needed
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, both input modes); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the gph/gpm/utilization
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (300 ft / 18 in / 0.9 gph ->
3.0 gpm, 25 percent).

## 5. Roadmap position

The drip sibling of the precipitation-rate pair; with `irrigation-zone-runtime` it covers both spray and
drip programming. A full drip lateral pressure-loss / maximum-run-length model (tubing ID, friction, pressure
variation) is a deliberate future tile, flagged because its coefficients are tubing-product-specific.
