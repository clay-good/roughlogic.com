# roughlogic.com Specification v774 -- Low-Speed Off-Tracking (Swept Path) (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`** (Group J),
> no new module, group, or dependency. Inherits spec.md through spec-v773.md. Explore sweep #18 (entry 6, final). Closes
> Explore sweep #18.
>
> **The gap, and the evidence for it.** Whether a truck stays in its lane through a turn or intersection comes down to
> **off-tracking** -- how far the rear axle cuts inside the front axle's path -- and no tile computes it. The low-speed
> geometric relation is `OT = R - sqrt(R^2 - sum(L_i^2))`, R the turn radius and each `L_i` a unit's wheelbase (summed in
> quadrature for a combination). The number this settles: a single unit with a **20 ft** wheelbase on a **50 ft** turn
> radius off-tracks **4.17 ft**. Grep confirmed no `off-track` / `swept path` / `tracking` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group J
`ssd-design-speed` sibling: the radius, wheelbases, and off-tracking carry `L`, the sum-of-squares `L^2`. The v18/v21
contract: a non-finite input (via `_finiteGuard`), a non-positive turn radius, a non-positive first wheelbase, a negative
second wheelbase, or a turn radius not greater than the effective wheelbase (the turn is geometrically impossible)
returns `{ error }`. Citation discipline (v19/v22): the low-speed off-tracking relation by name (AASHTO Green Book),
`GOVERNANCE.trucking` matching the sibling; the note states the turn-radius reference must be used consistently, and that
high-speed off-tracking (rear swings out) and full swept-path width (add the vehicle width) are separate analyses.

## 2. The tile

### 2.1 `truck-off-tracking` -- Low-Speed Off-Tracking (Swept Path)

```
inputs:
  turn_radius_ft    front-axle turn radius R (ft, > 0; must exceed the effective wheelbase)
  wheelbase1_ft     tractor / single-unit wheelbase (ft, > 0)
  wheelbase2_ft     trailer kingpin-to-rear-axle (ft, >= 0; 0 for a single unit)

sum_wb_sq_ft2        = wheelbase1^2 + wheelbase2^2
effective_wheelbase  = sqrt(sum_wb_sq_ft2)
off_tracking_ft      = R - sqrt(R^2 - sum_wb_sq_ft2)
```

**Pinned worked example.** R = 50 ft, wheelbase = 20 ft (single unit):
`OT = 50 - sqrt(2500 - 400) = 50 - 45.826 = ` **4.17 ft**; effective wheelbase **20 ft**. A two-unit rig with 12 ft and
16 ft wheelbases has the same effective 20 ft (`sqrt(144+256)`) and the same off-tracking -- the quadrature equivalence
pinned in the fuzzer. A tighter radius or a longer wheelbase off-tracks more; `0 < OT < effective wheelbase` always.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking"]`) placed with the later Group J tiles **outside the exact-count
(19) `// Group J: Trucking` .. `// Group K` audit block** (beside `ssd-design-speed`), so the audit is untouched; a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (the off-tracking relation, `GOVERNANCE.trucking`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`truck-off-tracking` ->
`computeTruckOffTracking`); `scripts/related-tiles.mjs` (-> `stopping-sight-distance` / `axle-load-distribution` /
`curve-deflection-stakeout`); `data/search/aliases.json` (5 collision-checked aliases: "truck off tracking", "trailer
swept path", ...); the calc-trucking `TRUCKING_RENDERERS` map entry via a hand-written (non-exported) renderer (turn
radius plus two wheelbase fields) and the id added to the calc-trucking declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the example, the quadrature equivalence, the radius/wheelbase monotonicity, the closed form across a sweep,
and the error seams. The calc-trucking.js gzip cap (raised to 32000 B in this spec) covers the addition. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,222 -> 1,223.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 4.17 ft for a 20 ft
wheelbase on a 50 ft radius).

## 5. Roadmap position

Adds the turning-geometry check the trucking bench was missing, alongside the sight-distance and axle/bridge tiles, and
closes Explore sweep #18 (the post-inverse forward-coverage batch). A high-speed off-tracking or full swept-path-width
tile is the natural next turning addition; a fresh Explore opens sweep #19.
