# roughlogic.com Specification v878 -- Rebar Tie-Wire Count and Weight (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v877.md. Rebar sweep, beside `rebar-weight-takeoff`
> and `rebar-schedule`.
>
> **The gap, and the evidence for it.** The catalog weighs bars (`rebar-weight-takeoff`) but nothing takes off the **tie
> wire** -- the intersections tied and the wire consumed. Grep confirmed no tie-wire tile. The number this settles: a
> 30 x 20 ft mat of #4 bars at 12 in each way has **651 intersections**, and tying half of them with 8 in ties is about
> **4 lb** of wire -- and a full-tie spec nearly doubles it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E rebar
siblings (`rebar-weight-takeoff`, `rebar-schedule`): the mat length, width, spacing, and tie length carry `L`, the tie
fraction is dimensionless, the wire weight per foot is `M L^-1`, the intersection and tie counts are dimensionless, the
wire length is `L`, and the wire weight is `M`. The v18/v21 contract: a non-finite or non-positive length, width, spacing,
tie length, or wire weight returns `{ error }`; a tie fraction outside 0-1 returns `{ error }`. Citation discipline
(v19/v22): the tie-wire identity by name (bars each way = floor(span / spacing) + 1; intersections = product; ties =
round(intersections x fraction); wire = ties x tie length / 12; weight = wire x wire per foot), `GOVERNANCE.general`; the
note states that the tie fraction follows the spec (every intersection along the mat perimeter and about half in the field
per CRSI practice), that the tie length depends on the bar size (about 6-9 in), that the wire weight per foot comes from
the gauge (16 to 16.5 ga annealed), and that this is distinct from the bar `rebar-weight-takeoff`.

## 2. The tile

### 2.1 `rebar-tie-wire` -- Rebar Tie-Wire Count and Weight

```
inputs:
  length_ft        mat length (ft)
  width_ft         mat width (ft)
  spacing_in       bar spacing each way (in, default 12)
  tie_fraction     fraction of intersections tied (0-1, default 0.5)
  tie_length_in    wire per tie (in, default 8)
  wire_lb_per_ft   tie wire weight (lb/ft, default 0.0181)

bars_along_length = floor(width_ft*12/spacing_in) + 1
bars_along_width  = floor(length_ft*12/spacing_in) + 1
intersections     = bars_along_length * bars_along_width
ties              = round(intersections * tie_fraction)
wire_ft           = ties * tie_length_in / 12
wire_lb           = wire_ft * wire_lb_per_ft
```

**Pinned worked example.** Mat 30 x 20 ft, #4 at 12 in each way, 50% tied, 8 in ties, 0.0181 lb/ft:
`bars = (floor(240/12)+1) x (floor(360/12)+1) = 21 x 31 = ` **651 intersections**; `ties = round(651*0.5) = ` **326**;
`wire = 326*8/12 = 217 ft`; `weight = 217*0.0181 = ` **3.9 lb**. Cross-check: a full-tie spec (fraction 1.0) ties all 651,
`651*8/12 = 434 ft` and **7.9 lb** -- the tie fraction is the lever the spec sets.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block near
`rebar-weight-takeoff`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (intersections = bars_x x bars_y; ties = round(intersections x fraction); weight = ties x length x
wire/ft, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example plus the full-tie cross-check);
`test/fixtures/compute-map.js` (`rebar-tie-wire` -> `computeRebarTieWire`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `rebar-weight-takeoff` / `rebar-schedule` / `welded-wire-mesh`);
`data/search/aliases.json` (5 collision-checked aliases: "rebar tie wire", "tie wire weight", "rebar ties count", "rebar
tie wire quantity", "reinforcement tie wire"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the
`rebar-weight-takeoff` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the intersections, ties, wire length, weight, and the error
seams (non-positive length, width, spacing, tie length, wire/ft; tie fraction out of 0-1). The calc-construction.js gzip
cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,326 -> 1,327.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(round(651*0.5)*8/12*0.0181 -> 3.9 lb).

## 5. Roadmap position

Rebar takeoff beside `rebar-weight-takeoff` (bars) and `welded-wire-mesh`, serving the rodbuster (concrete /
construction). Stays evidence-driven; the spec sets the tie fraction.
