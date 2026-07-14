# roughlogic.com Specification v756 -- Safe Curve Speed from Radius and Superelevation (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v755.md. Explore sweep #15 (entry 1).
>
> **The gap, and the evidence for it.** The `superelevation` tile solves the AASHTO point-mass relation for the required
> superelevation or the minimum radius -- the design speed V is always an INPUT in both of its modes, never solved. The
> field question is the inverse -- **the maximum safe speed a curve supports** from its radius, superelevation (bank), and
> side-friction factor. From `e + f = V^2 / (15 R)`, `V = sqrt( 15 R (e + f) )`. The number this settles: a **1,500 ft**
> radius at **e 0.08** and **f 0.12** supports about **67 mph**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`superelevation` sibling: the radius is `L` (ft), the superelevation and side-friction factor are dimensionless, and the
returned speed carries the sibling's bundled-unit dimensionless treatment (mph). It reuses the sibling's AASHTO point-mass
model, solved for the speed. The v18/v21 contract: any non-finite input, a non-positive radius, or a non-positive
`e + f` returns `{ error }`. Citation discipline (v19/v22): the point-mass relation solved for the speed,
`GOVERNANCE.general` matching the sibling; the note stresses that the **side-friction factor f decreases with speed** (use
the f for the resulting band and iterate once) and that this is the **point-mass model** (ignoring grade, the
transition/spiral, and driver comfort) with the civil engineer governing.

## 2. The tile

### 2.1 `superelevation-safe-curve-speed` -- Safe Curve Speed from Radius and Superelevation

```
inputs:
  R_ft   L             curve radius R (ft, > 0)
  e      dimensionless superelevation (bank) rate
  f      dimensionless side-friction factor (e + f must be > 0)

v_mph = sqrt( 15 x R_ft x (e + f) )
```

**Pinned worked example.** R = 1,500 ft, e = 0.08, f = 0.12:
`V = sqrt( 15 x 1500 x 0.20 ) = sqrt(4500) = ` **67.1 mph**. Feeding 67.1 mph back through `superelevation` (mode e) at the
same radius and f returns e = 0.08, the input. A larger 3,000 ft radius at the same bank and friction supports ~95 mph.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["surveying","civil"]`) placed beside `superelevation` (Group E is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (point-mass relation solved for the speed,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`superelevation-safe-curve-speed` -> `computeSuperelevationSafeCurveSpeed`);
`scripts/related-tiles.mjs` (-> `superelevation` / `horizontal-curve` / `stopping-sight-distance`);
`data/search/aliases.json` (4 collision-checked question aliases: "safe curve speed", "how fast can I take a curve", ...);
the calc-civil `CIVIL_RENDERERS` map entry via a hand-written renderer (three number fields) and the id added to the
calc-civil declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeSuperelevation` (mode e) across a radius/e/f sweep, the larger-radius-higher-speed and higher-bank-higher-speed
monotonicity, and the error seams (including the e+f <= 0 guard). The calc-civil.js gzip cap (raised to 12500 B in this
spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,204 -> 1,205.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 67.1 mph for a 1,500 ft
radius at e 0.08, f 0.12).

## 5. Roadmap position

Pairs the forward superelevation tile (which solves for e or R_min from the speed) with its distinct speed inverse, the
remaining unsolved variable in the AASHTO point-mass relation. Opens Explore sweep #15; further Group E civil growth stays
evidence-driven.
