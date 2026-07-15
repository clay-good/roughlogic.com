# roughlogic.com Specification v869 -- Suspended Acoustical Ceiling Grid Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v868.md. Ceilings sweep, beside `metal-stud-takeoff`
> and `tile-count`.
>
> **The gap, and the evidence for it.** Nothing takes off a **suspended acoustical ceiling** -- the panels, main tees,
> cross tees, wall angle, and hanger wires for a lay-in grid. Grep confirmed no ceiling-grid tile (`tile-count` is floor
> tile). The number this settles: a 24 x 40 ft room in a 2x4 grid is **120 panels**, **240 LF** of main tee, **480 LF** of
> cross tee, **128 LF** of wall angle, and **60 hanger wires** -- the whole grid order.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
takeoff siblings (`tile-count`, `metal-stud-takeoff`): the room length and width carry `L`, the area is `L^2`, the tee and
wall-angle lengths are `L`, and the panel and hanger counts are dimensionless. The v18/v21 contract: a non-finite or
non-positive room length or width returns `{ error }`. Citation discipline (v19/v22): the 2x4 grid takeoff ratios by name
(panels = area / 8; main tee = area / 4; cross tee = area / 2; wall angle = perimeter; hangers = area / 16),
`GOVERNANCE.general`; the note states that the ratios are for a standard 2x4 lay-in grid, that a 2x2 grid adds the 2-ft
cross tees (doubling the cross-tee run), that the hangers are on the mains at 4 ft on center, and that seismic areas add
bracing and clips per code.

## 2. The tile

### 2.1 `suspended-ceiling-grid` -- Suspended Acoustical Ceiling Grid Takeoff

```
inputs:
  room_length_ft  room length (ft)
  room_width_ft   room width (ft)

area_sf       = room_length_ft * room_width_ft
panels        = ceil(area_sf / 8)
main_tee_lf   = area_sf / 4
cross_tee_lf  = area_sf / 2
wall_angle_lf = 2 * (room_length_ft + room_width_ft)
hangers       = ceil(area_sf / 16)
```

**Pinned worked example.** Room 24 x 40 ft (960 sf):
`panels = ceil(960/8) = ` **120**; `main tee = 960/4 = ` **240 LF**; `cross tee = 960/2 = ` **480 LF**;
`wall angle = 2*(24+40) = ` **128 LF**; `hangers = ceil(960/16) = ` **60**. Cross-check: a smaller 12 x 20 ft room
(240 sf) scales to **30 panels**, **60 LF** main tee, **120 LF** cross tee, **64 LF** wall angle, and **15 hangers** --
every quantity but the wall angle tracks the area.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["drywall", "carpentry"]`, inside the `// Group E` construction block near
`metal-stud-takeoff`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (2x4 grid: panels=area/8, main=area/4, cross=area/2, hangers=area/16, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the smaller-room cross-check); `test/fixtures/compute-map.js`
(`suspended-ceiling-grid` -> `computeSuspendedCeilingGrid`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `metal-stud-takeoff` / `tile-count` / `drywall`); `data/search/aliases.json` (5
collision-checked aliases: "suspended ceiling grid", "acoustical ceiling takeoff", "drop ceiling grid", "ceiling tee
takeoff", "lay in ceiling grid"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `tile-count`
renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the area, panels, main tee, cross tee, wall angle, hangers, and the error seams
(non-positive room length or width). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,317 -> 1,318.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(960/8) -> 120 panels, 240 LF main, 60 hangers).

## 5. Roadmap position

Ceilings takeoff beside `metal-stud-takeoff` (walls) and `tile-count` (floors), serving the ceiling installer (drywall /
carpentry). Stays evidence-driven; the reflected ceiling plan governs the layout.
