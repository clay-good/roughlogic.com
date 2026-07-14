# roughlogic.com Specification v794 -- Glidepath Rate of Descent (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> the aviation cluster), no new module, group, or dependency. Inherits spec.md through spec-v793.md. Explore sweep #22
> (entry 3).
>
> **The gap, and the evidence for it.** Aviation-under-mechanic is the one under-served vein the sweep found (only
> density-altitude, crosswind, and weight-and-balance exist). Pilots fly a glidepath by setting a **rate of descent** from
> the ground speed, and no tile does it. `ROD(fpm) = ground_speed(kt) x 101.27 x tan(angle)`; the path steepness is
> `6076.12 x tan(angle)` ft/nm. The number this settles: **120 kt** on a **3.00 deg** glidepath is **637 ft/min**, and
> **318 ft/nm** -- the exact FAA TERPS value, which fixes the tangent (not sine) form. Grep confirmed no glidepath /
> descent-rate tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
aviation siblings (`density-altitude`, `crosswind-component`, `aircraft-weight-balance`): the ground speed carries `L
T^-1`, the glidepath angle is dimensionless, the rate of descent carries `L T^-1`, and the feet-per-nautical-mile
gradient is dimensionless. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive ground speed, or
a glidepath angle outside `(0, 90)` returns `{ error }`. Citation discipline (v19/v22): required rate of descent on a
glidepath by name (FAA Instrument Flying Handbook; TERPS Order 8260.3), `GOVERNANCE.general` matching the siblings; the
note derives the 101.27 knots-to-fpm conversion, states that the descent rate scales with ground speed (so wind changes
it), and that the TERPS 318 ft/nm at 3.00 deg fixes the tangent form against a sine mistake.

## 2. The tile

### 2.1 `glidepath-descent-rate` -- Glidepath Rate of Descent

```
inputs:
  ground_speed_kt        ground speed (kt)
  glidepath_angle_deg    glidepath angle (deg, 3.0 typical ILS)

tan       = tan(glidepath_angle_deg)
rod_fpm   = ground_speed_kt x 101.269 x tan   (101.269 = 6076.12 ft/nm / 60 min)
ft_per_nm = 6076.12 x tan
```

**Pinned worked example.** 120 kt, 3.0 deg: `tan(3) = 0.0524078`; `rod = 120 x 101.269 x 0.0524078 = ` **636.9 ft/min**;
`ft_per_nm = 6076.12 x 0.0524078 = ` **318.4 ft/nm** (the TERPS 318 at 3.00 deg). Doubling the ground speed doubles the
rate of descent; a steeper path descends faster; the ft/nm gradient is speed-independent.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) beside `engine-bmep`; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (FAA IFH / TERPS, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example,
two pinned outputs); `test/fixtures/compute-map.js` (`glidepath-descent-rate` -> `computeGlidepathDescentRate`);
`scripts/related-tiles.mjs` (-> `density-altitude` / `crosswind-component` / `aircraft-weight-balance`);
`data/search/aliases.json` (5 collision-checked aliases: "required rate of descent", "fpm for a 3 degree glideslope",
...); the calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no
DOM-sentinel row) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
ROD, the TERPS 318 ft/nm, the monotonicity, and the error seams. The calc-mechanic.js gzip cap is raised 46 -> 52 KB
(the module was at 99.4% before this batch; it holds engine-bmep and this aviation cluster; lazy-loaded, not in the home
payload). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,242 ->
1,243.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
`node scripts/check-module-sizes.mjs` (post-build, the CI-only module cap); worked-examples runner; 320 px audit; render
+ output read to the value (120 kt, 3 deg -> 637 fpm, 318 ft/nm).

## 5. Roadmap position

Opens the aviation cluster of Explore sweep #22 on the mechanic bench. A coordinated-turn-radius tile (from bank angle
and speed) and a climb-gradient rate-of-climb tile are queued next in the same cluster, under the raised calc-mechanic
cap. Stays evidence-driven.
