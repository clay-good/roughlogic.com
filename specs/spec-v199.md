# roughlogic.com Specification v199 -- Hydronic Radiant Floor Loop Sizing (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.81.0; part of catalog 648 -> 653). Batch spec-v199..v203 (plumbing/pipefitting -- hydronic radiant,
> condensate return, and three fabrication/process layout tiles).** In-scope catalog expansion under the
> spec-v106 trades-only charter: the radiant side of hydronic, which the catalog does not touch. Adds one
> tile to **`calc-plumbing.js`** (Group B); no new module, group, or dependency. Inherits spec.md through
> spec-v198.md.
>
> **The gap, and the evidence for it.** The catalog sizes boiler distribution mains (`boiler-pipe-sizing`),
> the expansion tank, and the glycol mix, but has nothing for the most common hydronic install of all: a
> radiant floor. The fitter laying PEX in a slab or staple-up needs the total tube footage from the area
> and the on-center spacing, the number of loops the footage breaks into against the per-loop length limit
> (so no loop exceeds the head the manifold can push), and the design flow per loop from the room load.
> That is a four-line calc done on every radiant job, and the catalog has the boiler and the expansion
> tank but not the loops between them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The floor
area is `L^2` (ft^2); the tube spacing and tube size are `L` (in); the tube footage and per-loop length
are `L` (ft); the design heat load is a power (`M L^2 T^-3`, Btu/hr, optionally as Btu/hr/ft^2); the loop
count is `dimensionless`; the design flow is `L^3/T` (GPM). The v18/v21 contract: any non-finite input, a
non-positive area, spacing, load, max-loop-length, or design delta-T returns `{ error }`; the divisions
are by the guarded-positive spacing, max-loop-length, and the `500 x delta-T` flow constant. Citation
discipline (v19/v22): `GOVERNANCE.general` over the tube-footage, loop-count, and `GPM = Q/(500 x dT)`
relations by name; `editionNote` names **ASHRAE HVAC Systems and Equipment (radiant panel chapter)** and
the Radiant Panel Association practice, and states that **the manufacturer's tubing tables and the
room-by-room heat loss govern the final layout** -- this sizes footage, loops, and flow from a uniform
load, not the panel surface-temperature or downward-loss design.

## 2. The tile

### 2.1 `radiant-loop-sizing` -- Tube Footage, Loop Count, and Flow per Loop

```
inputs:
  floor_area_ft2   L^2          heated floor area, ft^2
  spacing_in       L            tube on-center spacing, in (6, 9, 12 typical)
  load_btuhr       M L^2/T^3    design heat load for the area, Btu/hr (or Btu/hr/ft^2 x area)
  max_loop_ft      L            maximum length per loop (default 300 for 1/2 in PEX)
  design_dt        Theta        supply-to-return design delta-T, F (default 20)

tube_ft     = floor_area_ft2 x 12 / spacing_in          # one ft of tube per (spacing/12) ft^2
loops       = ceil(tube_ft / max_loop_ft)               # guarded: max_loop_ft > 0
per_loop_ft = tube_ft / loops
total_gpm   = load_btuhr / (500 x design_dt)            # guarded: design_dt > 0
per_loop_gpm = total_gpm / loops
```

**Pinned worked example.** 300 ft^2 at 6 in o.c., 9,000 Btu/hr load (30 Btu/hr/ft^2), 1/2 in PEX
(max 300 ft), 20 F delta-T: `tube = 300 x 12 / 6 = 600 ft`; `loops = ceil(600/300) = 2` at 300 ft each;
`total_gpm = 9000 / (500 x 20) = 0.90 GPM`, **0.45 GPM per loop**.
**Cross-check (wider spacing, fewer feet, one loop).** Same room at 12 in o.c.: `tube = 300 x 12 / 12 =
300 ft`; `loops = ceil(300/300) = 1`; the full 0.90 GPM runs the single loop. Spacing sets the footage;
the footage and the loop limit set the loop count.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["plumbing","hvac"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the footage/loop/flow relations, `editionNote` naming ASHRAE
and the manufacturer-governs caveat); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`radiant-loop-sizing` -> `computeRadiantLoopSizing` in
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `boiler-pipe-sizing` / `expansion-tank` /
`recirc-loop-sizing`); `data/search/aliases.json` ("radiant floor", "pex loop", "loop length",
"radiant tubing", "in-floor heat", "manifold loops"); the id appended to the existing plumbing renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, the cross-check, and error seams (non-finite,
area/spacing/load/max-loop/delta-T <= 0). Raise the `calc-plumbing.js` size cap by ~20 percent if needed
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the footage, loop, and flow lines wrap on a
phone); render-no-nan + a11y sweep, output read to the value (300 ft^2 / 6 in / 9,000 Btu/hr -> 600 ft,
2 loops, 0.45 GPM/loop).

## 5. Roadmap position

Fills the radiant gap between the boiler (`boiler-pipe-sizing`) and the expansion tank, completing the
residential hydronic chain. Further radiant growth (panel surface-temperature design, downward-loss,
snowmelt sizing) stays evidence-driven.
