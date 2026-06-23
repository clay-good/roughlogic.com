# roughlogic.com Specification v130 -- Wire Feed Speed to Melt-Off and Deposition Rate (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v129..v135.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fabrication tile from first-principles wire-volume geometry and
> steel density, WPS-and-fabricator governed, redo-not-harm. Adds one tile to **`calc-fab.js`**
> (Group E); no new module, group, or dependency. Inherits spec.md through spec-v129.md.
>
> **The gap, and the evidence for it.** The catalog computes heat input from amps and travel
> (`weld-heat-input`) and now the weld-metal weight a joint needs (`weld-metal-volume`, v129), but
> never the rate at which a wire process lays it down: the melt-off rate from wire feed speed and
> diameter, and the deposition rate after spatter loss. That rate sets the arc time behind every
> estimate and lets a welder dial a wire process to a target pounds-per-hour, and it has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Wire feed speed is `L T^-1` (in/min), wire diameter is `L`, wire cross-section is `L^2`, density is
`M L^-3`, and melt-off and deposition rates are `M T^-1` (lb/hr); deposition efficiency is
`dimensionless`. The bundled steel density (0.2836 lb/in^3) and the 60 min/hr conversion are
annotated editable fields. The v18/v21 contract: any non-finite input, a non-positive wire feed
speed or diameter, or a deposition efficiency outside (0, 1], returns `{ error }`; there are no
divisions by a user value. Citation discipline (v19/v22): `GOVERNANCE.general` over the melt-off
relation rate = WFS x area x density and the deposition = melt-off x efficiency relation; the WPS
and the process (spray vs short-circuit, gas, electrode extension) govern the real efficiency.

## 2. The tile

### 2.1 `wire-feed-deposition` -- Melt-Off and Deposition Rate from Wire Feed Speed

```
inputs:
  wfs_in_min       L T^-1         wire feed speed
  wire_dia_in      L              electrode diameter (0.030, 0.035, 0.045, 0.052, 1/16, ...)
  deposition_eff   dimensionless  deposited / melted (default 0.92 solid wire; ~0.85 FCAW)

wire_area_in2  = pi / 4 x wire_dia_in^2
melt_lb_hr     = wfs_in_min x 60 x wire_area_in2 x 0.2836
deposit_lb_hr  = melt_lb_hr x deposition_eff
```

**Pinned worked example.** 0.035 in solid wire at 300 in/min, efficiency 0.92:
`wire_area = 0.7854 x 0.035^2 = 0.000962 in^2`;
`melt = 300 x 60 x 0.000962 x 0.2836 = 4.91 lb/hr`; `deposit = 4.91 x 0.92 = 4.52 lb/hr`.
**Cross-check (larger wire, slower feed).** 0.045 in wire at 250 in/min, efficiency 0.92:
`wire_area = 0.001590 in^2`, `melt = 250 x 60 x 0.001590 x 0.2836 = 6.77 lb/hr`,
`deposit = 6.22 lb/hr` -- the bigger wire deposits more even at the lower feed, the expected
cross-section dominance. Pair with `weld-metal-volume` (deposit lb / deposition rate = arc time).
The WPS governs the qualified parameters.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding", "fabrication"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the melt-off and deposition formulas, the
0.2836 density and default efficiencies listed, `editionNote` single-edition first-principles);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`wire-feed-deposition` -> `computeWireFeedDeposition` in `../../calc-fab.js`); `scripts/related-
tiles.mjs` (-> `weld-metal-volume` / `weld-heat-input` / `weld-cost-per-foot`);
`data/search/aliases.json` ("wire feed speed", "wfs", "deposition rate", "melt off rate", "pounds
per hour", "mig wire"); the id appended to the existing `FAB_RENDERERS` declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
the example, cross-check, and error seams (non-finite, wfs/dia <= 0, efficiency outside (0,1]).
Raise the `calc-fab.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js`
cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the melt-off and deposition
lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (0.035 wire / 300
in/min -> 4.91 lb/hr melt, 4.52 lb/hr deposit).

## 5. Roadmap position

Second of the weld-estimating family (deposit volume v129, deposition rate). Further Group E growth
stays evidence-driven.
