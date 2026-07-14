# roughlogic.com Specification v775 -- Gear-Tooth Chordal Thickness for Caliper Inspection (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v774.md. Explore sweep #19 (entry 1).
>
> **The gap, and the evidence for it.** The `spur-gear-geometry` tile gives pitch/OD/root/addendum/center-distance, but
> not the two dimensions a machinist actually sets on a **gear-tooth (vernier) caliper** to inspect a cut tooth: the
> chordal tooth thickness and the chordal addendum. For a standard 20-degree full-depth involute, `tc = (N/Pd) sin(90/N deg)`
> and `ac = 1/Pd + (N/(2Pd))(1 - cos(90/N deg))`. The number this settles: **Pd 10, N 40** gives **tc = 0.1570 in** and
> **ac = 0.1015 in** (versus the arc thickness `pi/(2Pd) = 0.15708`). Grep confirmed no `chordal` / `gear tooth caliper` /
> `tooth thickness` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`spur-gear-geometry` sibling: the diametral pitch and tooth count carry its dimensionless treatment, the thicknesses and
addendum are lengths (`L`). The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive diametral
pitch, or a tooth count that is not a whole number of at least 3 returns `{ error }`. Citation discipline (v19/v22): the
gear-tooth-caliper method by name (Machinery's Handbook / AGMA), `GOVERNANCE.general` matching the sibling; the note
explains that `tc` is the straight chord of the arc thickness `pi/(2Pd)` (always slightly less), that `ac` is slightly
more than the addendum `1/Pd`, and that it assumes standard full-depth proportions with no profile shift and no backlash
allowance.

## 2. The tile

### 2.1 `gear-chordal-thickness` -- Gear-Tooth Chordal Thickness (Caliper)

```
inputs:
  diametral_pitch   Pd, teeth per inch (> 0)
  teeth             N, whole number >= 3

half_angle          = 90/N deg
chordal_thickness   = (N/Pd) x sin(half_angle)                       (caliper reading tc)
chordal_addendum    = 1/Pd + (N/(2Pd)) x (1 - cos(half_angle))       (caliper tongue depth ac)
arc_thickness       = pi/(2Pd)                                        (reference)
```

**Pinned worked example.** Pd = 10, N = 40 (half-angle 2.25 deg):
`tc = 4 x sin(2.25) = 4 x 0.039260 = ` **0.15704 in**; `ac = 0.100 + 2 x (1 - cos 2.25) = 0.100 + 0.001542 = ` **0.10154 in**;
the arc thickness is `pi/20 = 0.15708 in`, so the chord sits a hair under it. Both dimensions scale as `1/Pd` for a fixed
`N`, and as `N` grows the chord approaches the arc (a rack tooth is straight) -- all pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining", "mechanic"]`) placed with the later Group K machining tiles
**outside the exact-count (12) `// Group K: Mechanic` .. `// Group L` audit block** (beside `gear-identification`), so the
audit is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the caliper method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`gear-chordal-thickness` ->
`computeGearChordalThickness`); `scripts/related-tiles.mjs` (-> `spur-gear-geometry` / `gear-identification` /
`dividing-head`); `data/search/aliases.json` (5 collision-checked aliases: "gear tooth chordal thickness", "chordal
addendum", ...); the calc-machining `MACHINING_RENDERERS` map entry via a hand-written (non-exported) renderer (diametral
pitch and tooth-count fields) and the id added to the calc-machining declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the chord-under-arc relation, the 1/Pd scaling, the large-N limit, and the error seams. The
calc-machining.js gzip cap (raised to 21000 B in this spec) covers the addition. Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,223 -> 1,224.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.1570 in chordal
thickness and 0.1015 in chordal addendum for Pd 10, N 40).

## 5. Roadmap position

Pairs the `spur-gear-geometry` design tile with the shop-floor inspection dimensions, completing the spur-gear bench.
Continues the post-inverse forward-coverage vein (Explore sweep #19). A measurement-over-pins (for external gears) or
span-over-teeth (base-tangent) tile is the natural next gear-inspection addition, but each carries convention nuances to
verify; they stay evidence-driven.
