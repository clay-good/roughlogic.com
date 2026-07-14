# roughlogic.com Specification v695 -- Max Design Speed from Sight Distance (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`** (Group J,
> trucking / roadway), no new module, group, or dependency. Inherits spec.md through spec-v694.md.
>
> **The gap, and the evidence for it.** Spec-v (`stopping-sight-distance`) runs the AASHTO SSD relation forward: given a
> speed, it returns the required stopping sight distance. The roadway question is the inverse -- **given the sight
> distance available to a crest or intersection, what is the fastest safe design speed**. The forward tile makes you
> guess speeds and re-read the distance against the available sight line; the inverse solves it directly. `SSD = 1.47 x
> t x v + v^2 / (30 (f + g))` is a quadratic in `v`, so `v = (-b + sqrt(b^2 + 4 a x SSD)) / (2 a)` with `a = 1/(30(f+g))`
> and `b = 1.47 t`. The number this settles: with **490 ft** of sight distance on dry level pavement (f 0.35, t 2.5 s)
> the max is **55 mph**; a -6% downgrade drops it to **51 mph**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`stopping-sight-distance` sibling: the sight distance is `L` (ft), the reaction time is `T` (s), the friction and grade
are `dimensionless`, and the returned design speed is `L T^-1` (mph). It reuses the sibling's `SSD_FRICTION_DEFAULTS`
pavement-condition select and the 1.47 / 30 constants. The v18/v21 contract: any non-finite input, a non-positive sight
distance or reaction time, a friction at or below -1, or an effective deceleration `f + g <= 0` (the vehicle cannot
stop) returns `{ error }`. Citation discipline (v19/v22): the AASHTO Green Book SSD relation solved for speed, by name
and `GOVERNANCE.trucking` matching the sibling; the note states that **braking distance grows with the square of speed
while reaction distance grows linearly (so a modest sight-distance shortfall forces a larger speed cut than it seems), a
downhill grade and wet/icy friction lower the safe speed, and this is a design aid -- the AASHTO Green Book and the state
DOT govern posted and design speeds**.

## 2. The tile

### 2.1 `ssd-design-speed` -- Max Design Speed from Sight Distance

```
inputs:
  sight_distance_ft   ft   available stopping sight distance (> 0)
  reaction_time_s     s    perception-reaction time (> 0, default 2.5)
  friction            -    pavement friction f (default 0.35; condition select)
  grade               -    decimal grade, + uphill / - downhill

a = 1 / (30 (friction + grade))   (requires friction + grade > 0)
b = 1.47 x reaction_time_s
design_speed_mph = (-b + sqrt(b^2 + 4 a x sight_distance_ft)) / (2 a)
```

**Pinned worked example (dry level pavement).** sight distance = 490.225 ft, t = 2.5 s, f = 0.35, g = 0:
`a = 1/(30 x 0.35) = 0.09524`, `b = 1.47 x 2.5 = 3.675`, `v = (-3.675 + sqrt(3.675^2 + 4 x 0.09524 x 490.225)) /
(2 x 0.09524) = ` **55 mph**; feeding 55 mph back through `stopping-sight-distance` returns 490.225 ft, the input.
**Cross-check (a downgrade).** Same sight distance on a -6% grade: `f + g = 0.29`, so `v = ` **51.2 mph** -- the downhill
lengthens the stop, so the safe speed falls.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking"]`) placed in the LATER Group J section beside `tire-load-check`,
NOT beside `stopping-sight-distance` in the original block -- the Group J audit-coverage test asserts exactly 19 ids in
the `// Group J: Trucking`..`// Group K` block, so the row must stay out of it; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (SSD quadratic solved for speed, `GOVERNANCE.trucking` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`ssd-design-speed` ->
`computeSsdDesignSpeed` in `../../calc-trucking.js`); `scripts/related-tiles.mjs` (-> `stopping-sight-distance` /
`braking-distance` / `vertical-curve-sight-distance`, and the forward tile links back); `data/search/aliases.json` ("max
speed for available sight distance", "safe speed from sight distance", "advisory speed from stopping distance", plus
adjacent rows); the calc-trucking `TRUCKING_RENDERERS` map entry `"ssd-design-speed": renderSsdDesignSpeed` via a
hand-written renderer with the same pavement-condition `makeSelect` as the sibling (the select fills the friction default
and feeds the compute, satisfying check-dead-inputs) and the id added to the calc-trucking declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the downhill-lowers-speed check, the round-trip through
`computeStoppingSightDistance`, and the error seams. The calc-trucking.js gzip cap is expected to hold (verify at build,
including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 55 mph for 490 ft of sight distance).

## 5. Roadmap position

Pairs the forward SSD tile (`stopping-sight-distance`, distance from speed) with its inverse (max speed from the sight
distance), the two halves of the sight-distance design question. Further Group J growth stays evidence-driven.
