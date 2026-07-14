# roughlogic.com Specification v796 -- Climb Gradient to Rate of Climb (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> the aviation cluster), no new module, group, or dependency. Inherits spec.md through spec-v795.md. Explore sweep #22
> (entry 6).
>
> **The gap, and the evidence for it.** The last aviation-cluster tile, and the climb complement to
> `glidepath-descent-rate`: departure procedures state the climb as a **gradient in feet per nautical mile**, but the
> cockpit reads **feet per minute**, and no tile reconciles them. `ROC(fpm) = gradient(ft/nm) x ground_speed(kt) / 60`.
> The number this settles: a **300 ft/nm** gradient at **120 kt** needs **600 ft/min** (4.94%). Grep confirmed no climb-
> gradient / rate-of-climb tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
aviation siblings (`glidepath-descent-rate`, `turn-radius-bank`): the climb gradient (ft/nm) is dimensionless, the ground
speed carries `L T^-1`, the rate of climb carries `L T^-1`, and the gradient percent and angle are dimensionless. The
v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive gradient, or a non-positive ground speed
returns `{ error }`. Citation discipline (v19/v22): climb gradient to rate of climb by name (FAA TERPS / AIM departure
procedures), `GOVERNANCE.general` matching the siblings; the note states the ground-speed reconciliation, that the
required rate of climb scales with ground speed (so wind changes it), that a heavy high-density-altitude departure may
not make a steep gradient, and that the standard default gradient is 200 ft/nm (~3.3%).

## 2. The tile

### 2.1 `climb-gradient-roc` -- Climb Gradient to Rate of Climb

```
inputs:
  climb_gradient_ft_per_nm   required climb gradient (ft/nm, 200 default)
  ground_speed_kt            ground speed (kt)

roc_fpm          = climb_gradient_ft_per_nm x ground_speed_kt / 60
gradient_percent = climb_gradient_ft_per_nm / 6076.12 x 100
gradient_deg     = atan(climb_gradient_ft_per_nm / 6076.12)
```

**Pinned worked example.** 300 ft/nm, 120 kt: `roc = 300 x 120 / 60 = ` **600 ft/min**; `gradient_percent = 300 / 6076.12
x 100 = ` **4.94%** (2.83 deg). ROC scales linearly with both ground speed and gradient; the gradient percent is
speed-independent. A tailwind or a faster climb speed raises the required rate of climb for the same gradient.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) beside `turn-radius-bank`; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (FAA TERPS / AIM, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example,
two pinned outputs); `test/fixtures/compute-map.js` (`climb-gradient-roc` -> `computeClimbGradientRoc`);
`scripts/related-tiles.mjs` (-> `glidepath-descent-rate` / `density-altitude` / `turn-radius-bank`);
`data/search/aliases.json` (5 collision-checked aliases: "climb gradient to feet per minute", "required rate of climb
departure", ...); the calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no
DOM-sentinel row) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
ROC, the gradient percent, the monotonicity, and the error seams. The calc-mechanic.js gzip cap (52 KB, raised in v794)
is unchanged. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,244
-> 1,245.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (300 ft/nm, 120 kt -> 600 fpm).

## 5. Roadmap position

Closes the sweep-22 aviation cluster (glidepath descent rate, coordinated-turn radius, climb-gradient rate of climb) on
the mechanic bench, rounding out the approach-and-departure performance set alongside density-altitude, crosswind, and
weight-and-balance. A takeoff/landing-distance or a top-of-descent tile is the natural next aviation addition; it stays
evidence-driven. With the cluster done, the next batch opens a fresh Explore sweep.
