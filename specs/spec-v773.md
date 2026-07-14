# roughlogic.com Specification v773 -- Bunker (Horizontal) Silo Forage Capacity (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group L),
> no new module, group, or dependency. Inherits spec.md through spec-v772.md. Explore sweep #18 (entry 5).
>
> **The gap, and the evidence for it.** The catalog sizes a round `grain-bin-capacity` but has nothing for the other
> universal on-farm store: the **horizontal bunker / trench silo** that holds silage. The volume is a trapezoidal prism:
> `cross-section = (bottom + top)/2 x average depth`, `volume = cross-section x length`, `tons = volume x density / 2000`.
> The number this settles: a **30 ft** wide, **8 ft** deep, **100 ft** bunker at **44 lb/ft^3** as-fed holds about
> **528 tons**. Grep confirmed no `bunker` / `silage` / `silo` / `forage`-storage tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group L
`grain-bin-capacity` sibling: the widths, depth, and length carry `L`, the cross-section `L^2`, the volume `L^3`, the
as-fed density `M L^-3`, and the tonnage the module's dimensionless treatment. The v18/v21 contract: a non-finite input
(via `_finiteGuard`), or a non-positive bottom width, top width, average depth, length, or density returns `{ error }`.
Citation discipline (v19/v22): the trapezoidal-prism volume and the `tons = volume x density / 2000` relation by name
(NRCS / MWPS forage storage), `GOVERNANCE.general`; the note states that the as-fed density is user-entered because it
swings with dry matter and packing (corn silage ~40-50 lb/ft^3), that the settled depth (not the fill height) is used,
and that a core sample or a weigh-back governs the real inventory.

## 2. The tile

### 2.1 `bunker-silo-capacity` -- Bunker (Horizontal) Silo Forage Capacity

```
inputs:
  bottom_width_ft   floor width (ft, > 0)
  top_width_ft      top width (ft, > 0; = bottom for vertical walls, wider for sloped)
  average_depth_ft  average settled forage depth (ft, > 0)
  length_ft         bunker length (ft, > 0)
  density_lb_ft3    as-fed density (lb/ft^3, > 0; default 44)

cross_section_ft2 = (bottom_width + top_width)/2 x average_depth
volume_ft3        = cross_section_ft2 x length
volume_yd3        = volume_ft3 / 27
tons              = volume_ft3 x density / 2000
```

**Pinned worked example.** bottom = top = 30 ft (vertical walls), depth = 8 ft, length = 100 ft, density = 44 lb/ft^3:
`A = (30+30)/2 x 8 = 240 ft^2`, `V = 240 x 100 = 24,000 ft^3`, `tons = 24000 x 44 / 2000 = ` **528**. A sloped bunker
(bottom 20, top 40) with the same mean width gives the same tonnage, and the capacity is linear in length, depth, and
density -- all pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`) placed with the later Group L agriculture tiles **outside the
exact-count (30) `// Group L: Agriculture` .. `// Group M` audit block** (beside `grain-bin-height-for-capacity`), so the
audit is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the trapezoidal-prism volume + tonnage,
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`bunker-silo-capacity` -> `computeBunkerSiloCapacity`); `scripts/related-tiles.mjs` (-> `grain-bin-capacity` /
`cattle-stocking-rate` / `crop-yield`); `data/search/aliases.json` (5 collision-checked aliases: "bunker silo capacity",
"silage tonnage", ...); the calc-agriculture `AGRICULTURE_RENDERERS` map entry via a hand-written renderer (bottom/top
width, average depth, length, and as-fed density number fields) and the id added to the calc-agriculture declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the sloped-wall mean-width equivalence, the linear-in-length/depth/
density scalings, the `tons = volume x density / 2000` identity across a sweep, and the error seams. The
calc-agriculture.js gzip cap (raised to 56000 B in this spec) covers the addition. Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,221 -> 1,222.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 528 tons for a 30 ft wide,
8 ft deep, 100 ft bunker at 44 lb/ft^3).

## 5. Roadmap position

Pairs the round `grain-bin-capacity` with the horizontal forage store, closing the on-farm storage set. Continues the
post-inverse forward-coverage vein (Explore sweep #18). A silage-shrink (dry-matter-loss) or feed-out-rate tile is the
natural next forage addition; it stays evidence-driven.
